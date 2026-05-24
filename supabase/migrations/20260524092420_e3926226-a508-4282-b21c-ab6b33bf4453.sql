
-- Drop the helper view (definer-view lint)
DROP VIEW IF EXISTS public.public_profiles;

-- Create separate private table for sensitive fields
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY,
  email text,
  last_known_latitude double precision,
  last_known_longitude double precision,
  last_location_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own private profile"
ON public.profiles_private FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own private profile"
ON public.profiles_private FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own private profile"
ON public.profiles_private FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own private profile"
ON public.profiles_private FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Migrate existing data
INSERT INTO public.profiles_private (user_id, email, last_known_latitude, last_known_longitude, last_location_updated_at)
SELECT user_id, email, last_known_latitude, last_known_longitude, last_location_updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Remove sensitive columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS last_known_latitude,
  DROP COLUMN IF EXISTS last_known_longitude,
  DROP COLUMN IF EXISTS last_location_updated_at;

-- Restore broader SELECT now that sensitive data is gone
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Update handle_new_user to populate both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, theme, language)
  VALUES (new.id, 'light', 'en')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.profiles_private (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO UPDATE SET email = new.email;
  RETURN new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
