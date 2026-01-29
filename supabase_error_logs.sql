-- Create Error Logs Table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    stack TEXT
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert logs
CREATE POLICY "Users can insert error logs" 
ON public.error_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Only admins/service role can view (or maybe users view their own for debugging?)
-- For now, allow users to view their own just in case, but primary use is internal analysis
CREATE POLICY "Users can view their own error logs" 
ON public.error_logs FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());
