-- Create atomic function for first admin creation with proper locking
CREATE OR REPLACE FUNCTION public.create_first_admin(new_user_id UUID, admin_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INT;
BEGIN
  -- Lock the table to prevent race conditions
  LOCK TABLE admin_users IN EXCLUSIVE MODE;
  
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  
  IF admin_count = 0 THEN
    INSERT INTO admin_users (user_id, name) VALUES (new_user_id, admin_name);
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;