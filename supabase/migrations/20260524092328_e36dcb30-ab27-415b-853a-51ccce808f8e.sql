
-- Restrict profiles SELECT to owner only (protects email & location)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Public view exposing only non-sensitive username for cross-user lookups
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT user_id, username FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow public username lookups via a SECURITY DEFINER helper that returns only username
CREATE OR REPLACE FUNCTION public.get_username(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT username FROM public.profiles WHERE user_id = _user_id $$;
REVOKE ALL ON FUNCTION public.get_username(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_username(uuid) TO anon, authenticated;

-- Restrict discovered_kunstwerken SELECT to authenticated users
DROP POLICY IF EXISTS "Users can view all discoveries" ON public.discovered_kunstwerken;
CREATE POLICY "Authenticated users can view discoveries"
ON public.discovered_kunstwerken FOR SELECT TO authenticated
USING (true);

-- Restrict user_achievements SELECT to authenticated users; drop redundant duplicate
DROP POLICY IF EXISTS "Users can view all users' achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Authenticated users can view achievements"
ON public.user_achievements FOR SELECT TO authenticated
USING (true);

-- Fix model-thumbnails storage policies to verify ownership
DROP POLICY IF EXISTS "Users can delete their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own thumbnails" ON storage.objects;
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'model-thumbnails' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'model-thumbnails' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Revoke EXECUTE on SECURITY DEFINER trigger/util functions from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_model_data() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
