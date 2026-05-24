
DROP FUNCTION IF EXISTS public.get_username(uuid);
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT user_id, username FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
