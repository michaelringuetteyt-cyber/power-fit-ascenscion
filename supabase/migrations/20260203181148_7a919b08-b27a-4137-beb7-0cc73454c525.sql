-- Create function to deduct a session from the most appropriate pass
CREATE OR REPLACE FUNCTION public.deduct_session_from_pass(p_user_id uuid)
RETURNS TABLE(
  success boolean,
  pass_id uuid,
  remaining_sessions integer,
  pass_type text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pass RECORD;
  v_new_remaining integer;
BEGIN
  -- Find the best active pass to deduct from
  -- Priority: 1. Expiring soonest, 2. Fewest sessions remaining
  SELECT p.id, p.remaining_sessions, p.pass_type
  INTO v_pass
  FROM passes p
  WHERE p.user_id = p_user_id
    AND p.status = 'active'
    AND p.remaining_sessions > 0
    AND (p.expiry_date IS NULL OR p.expiry_date >= CURRENT_DATE)
  ORDER BY 
    CASE WHEN p.expiry_date IS NOT NULL THEN 0 ELSE 1 END,
    p.expiry_date NULLS LAST,
    p.remaining_sessions ASC
  LIMIT 1;
  
  IF v_pass IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      NULL::uuid,
      NULL::integer,
      NULL::text,
      'Aucun laissez-passer actif trouvé pour ce client'::text;
    RETURN;
  END IF;
  
  -- Calculate new remaining sessions
  v_new_remaining := v_pass.remaining_sessions - 1;
  
  -- Update the pass
  UPDATE passes
  SET 
    remaining_sessions = v_new_remaining,
    status = CASE WHEN v_new_remaining = 0 THEN 'used' ELSE 'active' END
  WHERE id = v_pass.id;
  
  RETURN QUERY SELECT 
    true::boolean,
    v_pass.id,
    v_new_remaining,
    v_pass.pass_type,
    CASE 
      WHEN v_new_remaining = 0 THEN 'Dernière séance utilisée - Pass épuisé'
      ELSE 'Séance déduite avec succès'
    END::text;
END;
$function$;

-- Function to expire passes that have passed their expiry date
CREATE OR REPLACE FUNCTION public.expire_outdated_passes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE passes
  SET status = 'expired'
  WHERE status = 'active'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
END;
$function$;