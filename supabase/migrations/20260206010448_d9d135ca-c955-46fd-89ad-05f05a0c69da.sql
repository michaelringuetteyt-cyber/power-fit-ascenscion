-- Function to refund a session when a booking is cancelled
CREATE OR REPLACE FUNCTION public.refund_session_to_pass(p_booking_id uuid)
RETURNS TABLE(success boolean, pass_id uuid, remaining_sessions integer, pass_type text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deduction RECORD;
  v_new_remaining integer;
BEGIN
  -- Find the deduction record for this booking
  SELECT sd.id, sd.pass_id, sd.pass_type, sd.user_id, p.remaining_sessions
  INTO v_deduction
  FROM session_deductions sd
  JOIN passes p ON p.id = sd.pass_id
  WHERE sd.booking_id = p_booking_id
  LIMIT 1;
  
  IF v_deduction IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      NULL::uuid,
      NULL::integer,
      NULL::text,
      'Aucune déduction trouvée pour cette réservation'::text;
    RETURN;
  END IF;
  
  -- Calculate new remaining sessions
  v_new_remaining := v_deduction.remaining_sessions + 1;
  
  -- Update the pass to add back the session
  UPDATE passes
  SET 
    remaining_sessions = v_new_remaining,
    status = 'active'
  WHERE id = v_deduction.pass_id;
  
  -- Delete the deduction record
  DELETE FROM session_deductions WHERE booking_id = p_booking_id;
  
  RETURN QUERY SELECT 
    true::boolean,
    v_deduction.pass_id,
    v_new_remaining,
    v_deduction.pass_type,
    'Séance remboursée avec succès'::text;
END;
$$;