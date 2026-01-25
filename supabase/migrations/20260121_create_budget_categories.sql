-- Create budget_categories table
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  limit_amount NUMERIC DEFAULT 0,
  color TEXT NOT NULL, -- Tailwind class or Hex
  icon_key TEXT NOT NULL, -- Lucide icon name
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own categories" 
ON public.budget_categories FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" 
ON public.budget_categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.budget_categories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.budget_categories FOR DELETE 
USING (auth.uid() = user_id);

-- Optional: Seed function if needed, but handled in frontend usually for "defaults"
