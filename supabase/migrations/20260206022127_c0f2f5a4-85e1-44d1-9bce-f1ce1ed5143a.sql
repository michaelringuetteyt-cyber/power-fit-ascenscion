-- Create employee_permissions table
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  can_view_dashboard boolean DEFAULT false,
  can_view_stats boolean DEFAULT false,
  can_manage_chat boolean DEFAULT false,
  can_manage_bookings boolean DEFAULT false,
  can_manage_content boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage all employees
CREATE POLICY "Admins can view employees" 
ON public.employee_permissions FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert employees" 
ON public.employee_permissions FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update employees" 
ON public.employee_permissions FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete employees" 
ON public.employee_permissions FOR DELETE USING (is_admin());

-- Employees can view their own permissions
CREATE POLICY "Employees can view own permissions" 
ON public.employee_permissions FOR SELECT USING (user_id = auth.uid());

-- Function to check employee permissions
CREATE OR REPLACE FUNCTION public.has_employee_permission(
  p_user_id uuid, 
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE p_permission
      WHEN 'dashboard' THEN can_view_dashboard
      WHEN 'stats' THEN can_view_stats
      WHEN 'chat' THEN can_manage_chat
      WHEN 'bookings' THEN can_manage_bookings
      WHEN 'content' THEN can_manage_content
      WHEN 'users' THEN can_manage_users
      ELSE false
    END
    FROM employee_permissions
    WHERE user_id = p_user_id),
    false
  );
$$;

-- Function to check if user is employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'employee')
$$;