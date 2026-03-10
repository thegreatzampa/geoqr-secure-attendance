-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create an RPC function for admins to create students directly
CREATE OR REPLACE FUNCTION public.admin_create_student(
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- 1. Verify the caller is an admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can create new students directly.';
  END IF;

  -- 2. Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = student_email) THEN
    RAISE EXCEPTION 'A user with this email already exists.';
  END IF;

  -- 3. Generate secure UUID and hash the password (which is the phone number)
  new_user_id := extensions.gen_random_uuid();
  -- We use the phone number as the raw password
  hashed_password := extensions.crypt(student_phone, extensions.gen_salt('bf'));

  -- 4. Insert into auth.users mapped exactly to Supabase's required schema
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    student_email,
    hashed_password,
    now(), -- Auto confirm their email
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', student_name, 'phone_number', student_phone),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 5. Insert into invited_students record so admin can track them
  INSERT INTO public.invited_students (
    admin_id,
    name,
    phone_number,
    email
  ) VALUES (
    auth.uid(),
    student_name,
    student_phone,
    student_email
  );

  RETURN new_user_id;
END;
$$;
