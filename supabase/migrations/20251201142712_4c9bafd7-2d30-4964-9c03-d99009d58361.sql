-- Add email column to profiles table for username login lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create index for faster username lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(lower(username));

-- Update the handle_new_user function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, theme, language)
  VALUES (new.id, new.email, 'light', 'en')
  ON CONFLICT (user_id) DO UPDATE SET email = new.email;
  RETURN new;
END;
$$;

-- Create trigger if it doesn't exist (drop first to recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();