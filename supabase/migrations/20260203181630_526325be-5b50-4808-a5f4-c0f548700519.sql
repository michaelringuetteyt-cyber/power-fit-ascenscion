-- Create session deductions history table
CREATE TABLE public.session_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pass_id UUID NOT NULL REFERENCES public.passes(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  deducted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pass_type TEXT NOT NULL,
  remaining_after INTEGER NOT NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.session_deductions ENABLE ROW LEVEL SECURITY;

-- Admins can view all deductions
CREATE POLICY "Admins can view all deductions"
ON public.session_deductions FOR SELECT
USING (public.is_admin());

-- Admins can insert deductions
CREATE POLICY "Admins can insert deductions"
ON public.session_deductions FOR INSERT
WITH CHECK (public.is_admin());

-- Users can view their own deductions
CREATE POLICY "Users can view their own deductions"
ON public.session_deductions FOR SELECT
USING (auth.uid() = user_id);

-- Update the deduct function to log history
CREATE OR REPLACE FUNCTION public.deduct_session_from_pass(p_user_id uuid, p_booking_id uuid DEFAULT NULL)
RETURNS TABLE(success boolean, pass_id uuid, remaining_sessions integer, pass_type text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pass RECORD;
  v_new_remaining integer;
BEGIN
  -- Find the best active pass to deduct from
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
  
  -- Log the deduction in history
  INSERT INTO session_deductions (user_id, pass_id, booking_id, pass_type, remaining_after)
  VALUES (p_user_id, v_pass.id, p_booking_id, v_pass.pass_type, v_new_remaining);
  
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