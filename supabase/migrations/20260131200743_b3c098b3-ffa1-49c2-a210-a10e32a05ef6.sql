-- Create chat sessions table for anonymous clients
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL DEFAULT 'Visiteur',
    client_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'admin')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin users table (simple admin authentication)
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies (public access for clients, admin can see all)
CREATE POLICY "Anyone can create chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view their session by ID" 
ON public.chat_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update their session" 
ON public.chat_sessions 
FOR UPDATE 
USING (true);

-- Chat messages policies
CREATE POLICY "Anyone can insert messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view messages" 
ON public.chat_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update message read status" 
ON public.chat_messages 
FOR UPDATE 
USING (true);

-- Admin users policies
CREATE POLICY "Admins can view admin users" 
ON public.admin_users 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only existing admins can insert new admins" 
ON public.admin_users 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
    OR NOT EXISTS (SELECT 1 FROM public.admin_users)
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for chat sessions
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();