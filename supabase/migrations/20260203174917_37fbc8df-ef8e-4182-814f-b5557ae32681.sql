-- Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create is_admin function for convenience
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin());

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name text NOT NULL DEFAULT '',
    email text NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin());

-- Create passes table
CREATE TABLE public.passes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    pass_type text NOT NULL CHECK (pass_type IN ('5_sessions', '10_sessions', 'monthly')),
    total_sessions integer NOT NULL,
    remaining_sessions integer NOT NULL,
    purchase_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on passes
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- RLS policies for passes
CREATE POLICY "Users can view their own passes"
ON public.passes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all passes"
ON public.passes
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert passes"
ON public.passes
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update passes"
ON public.passes
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete passes"
ON public.passes
FOR DELETE
USING (public.is_admin());

-- Create purchases table
CREATE TABLE public.purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    pass_id uuid REFERENCES public.passes(id) ON DELETE SET NULL,
    item_name text NOT NULL,
    amount decimal(10,2) NOT NULL,
    purchase_date timestamp with time zone NOT NULL DEFAULT now(),
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded'))
);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchases
CREATE POLICY "Users can view their own purchases"
ON public.purchases
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert purchases"
ON public.purchases
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update purchases"
ON public.purchases
FOR UPDATE
USING (public.is_admin());

-- Add user_id to bookings table
ALTER TABLE public.bookings ADD COLUMN user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add policy for users to view their own bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
USING (user_id = auth.uid());

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Add client role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Migrate existing admin_users to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;