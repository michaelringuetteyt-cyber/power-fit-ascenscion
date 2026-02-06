-- Add RLS policy for admins to delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

-- Add RLS policy for admins to delete session_deductions
CREATE POLICY "Admins can delete deductions" 
ON public.session_deductions 
FOR DELETE 
USING (is_admin());

-- Add RLS policy for admins to delete purchases
CREATE POLICY "Admins can delete purchases" 
ON public.purchases 
FOR DELETE 
USING (is_admin());