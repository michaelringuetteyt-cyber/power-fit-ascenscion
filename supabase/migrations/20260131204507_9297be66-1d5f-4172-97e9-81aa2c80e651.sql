-- Create table for available booking dates
CREATE TABLE public.available_dates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    time_slots text[] NOT NULL DEFAULT ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE(date)
);

-- Enable Row Level Security
ALTER TABLE public.available_dates ENABLE ROW LEVEL SECURITY;

-- Anyone can view available dates
CREATE POLICY "Anyone can view available dates"
ON public.available_dates
FOR SELECT
USING (is_active = true);

-- Admins can view all dates (including inactive)
CREATE POLICY "Admins can view all dates"
ON public.available_dates
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);

-- Admins can insert available dates
CREATE POLICY "Admins can insert available dates"
ON public.available_dates
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);

-- Admins can update available dates
CREATE POLICY "Admins can update available dates"
ON public.available_dates
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);

-- Admins can delete available dates
CREATE POLICY "Admins can delete available dates"
ON public.available_dates
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);

-- Create table for bookings
CREATE TABLE public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    time_slot text NOT NULL,
    appointment_type text NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_phone text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert bookings
CREATE POLICY "Anyone can insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);

-- Admins can update bookings
CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    )
);