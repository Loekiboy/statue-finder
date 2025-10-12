-- Fix the security definer view warning by recreating as SECURITY INVOKER
-- Drop and recreate the public_models view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_models;

CREATE OR REPLACE VIEW public.public_models
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  file_path,
  latitude,
  longitude,
  created_at,
  updated_at
FROM public.models
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Grant permissions
GRANT SELECT ON public.public_models TO anon, authenticated;