-- Enable realtime for site_content table to allow live gallery updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;