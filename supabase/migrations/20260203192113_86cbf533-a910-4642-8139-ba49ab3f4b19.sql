-- Create function to check trial eligibility and create trial pass if eligible
CREATE OR REPLACE FUNCTION public.create_trial_pass_if_eligible(p_user_id uuid)
RETURNS TABLE(success boolean, pass_id uuid, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_count integer;
  v_new_pass_id uuid;
BEGIN
  -- Check if user already has a trial pass (any status)
  SELECT COUNT(*) INTO v_existing_count
  FROM passes
  WHERE user_id = p_user_id AND pass_type = 'trial';
  
  IF v_existing_count > 0 THEN
    -- User already has a trial pass
    RETURN QUERY SELECT 
      false::boolean,
      NULL::uuid,
      'already_used'::text;
    RETURN;
  END IF;
  
  -- Create new trial pass
  INSERT INTO passes (user_id, pass_type, total_sessions, remaining_sessions, status, expiry_date)
  VALUES (p_user_id, 'trial', 1, 1, 'active', NULL)
  RETURNING id INTO v_new_pass_id;
  
  RETURN QUERY SELECT 
    true::boolean,
    v_new_pass_id,
    'created'::text;
END;
$$;