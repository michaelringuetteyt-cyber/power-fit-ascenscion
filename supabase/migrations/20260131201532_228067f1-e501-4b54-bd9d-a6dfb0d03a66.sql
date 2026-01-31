-- Create site_content table for managing site images and text
CREATE TABLE public.site_content (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    section TEXT NOT NULL,
    content_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'url'
    content_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(section, content_key)
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view site content (public site)
CREATE POLICY "Anyone can view site content"
ON public.site_content FOR SELECT
USING (true);

-- Only admins can update site content
CREATE POLICY "Admins can update site content"
ON public.site_content FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Only admins can insert site content
CREATE POLICY "Admins can insert site content"
ON public.site_content FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Only admins can delete site content
CREATE POLICY "Admins can delete site content"
ON public.site_content FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Create storage bucket for site images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-images', 'site-images', true);

-- Storage policies for site images
CREATE POLICY "Anyone can view site images"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

CREATE POLICY "Admins can upload site images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'site-images' 
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can update site images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'site-images' 
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can delete site images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'site-images' 
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();