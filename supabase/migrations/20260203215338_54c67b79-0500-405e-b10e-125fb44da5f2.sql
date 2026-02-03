-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-files', 'invoice-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for invoice-files bucket (admin only)
CREATE POLICY "Admins can view invoice files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoice-files' AND is_admin());

CREATE POLICY "Admins can upload invoice files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoice-files' AND is_admin());

CREATE POLICY "Admins can update invoice files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'invoice-files' AND is_admin());

CREATE POLICY "Admins can delete invoice files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'invoice-files' AND is_admin());