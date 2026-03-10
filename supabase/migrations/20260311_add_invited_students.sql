-- Create the invited_students table
CREATE TABLE IF NOT EXISTS public.invited_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invited_students ENABLE ROW LEVEL SECURITY;

-- Policies for invited_students
CREATE POLICY "Admins can view their invited students"
  ON public.invited_students
  FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can insert invited students"
  ON public.invited_students
  FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their invited students"
  ON public.invited_students
  FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their invited students"
  ON public.invited_students
  FOR DELETE
  USING (auth.uid() = admin_id);
