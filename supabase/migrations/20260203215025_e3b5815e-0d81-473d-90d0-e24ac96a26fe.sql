-- Table pour les notes clients (visibles uniquement par les admins)
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les factures clients (visibles uniquement par les admins)
CREATE TABLE public.client_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_notes (admin only)
CREATE POLICY "Admins can view all client notes"
ON public.client_notes
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert client notes"
ON public.client_notes
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update client notes"
ON public.client_notes
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete client notes"
ON public.client_notes
FOR DELETE
USING (is_admin());

-- RLS Policies for client_invoices (admin only)
CREATE POLICY "Admins can view all client invoices"
ON public.client_invoices
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert client invoices"
ON public.client_invoices
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update client invoices"
ON public.client_invoices
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete client invoices"
ON public.client_invoices
FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_invoices_updated_at
BEFORE UPDATE ON public.client_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();