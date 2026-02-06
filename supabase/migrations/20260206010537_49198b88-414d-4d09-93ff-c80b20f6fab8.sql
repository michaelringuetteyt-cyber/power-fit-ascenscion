-- Allow admins to delete bookings
CREATE POLICY "Admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.user_id = auth.uid())));