-- Create table for logging every search/content generation request
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Only the service_role can read search_logs (used by admin dashboard edge function)
-- Regular users cannot read this table at all
CREATE POLICY "Service role only reads search_logs"
ON public.search_logs
FOR SELECT
USING (false);

-- Users can insert their own search logs (the edge function runs as the user)
CREATE POLICY "Users can insert their own search logs"
ON public.search_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
