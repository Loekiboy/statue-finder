-- Fix PUBLIC_DATA_EXPOSURE: Restrict direct access to models table
-- Update the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view models" ON public.models;

-- Require authentication to view full model data (including user_id)
CREATE POLICY "Authenticated users can view all models"
ON public.models
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create a public view for discoveries that excludes sensitive user_id
CREATE OR REPLACE VIEW public.public_models AS
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

-- Allow anyone to view the public view
GRANT SELECT ON public.public_models TO anon, authenticated;

-- Fix INPUT_VALIDATION: Add database constraints
-- Add length constraints to prevent oversized inputs
ALTER TABLE public.models
ADD CONSTRAINT name_length_check CHECK (length(name) <= 100 AND length(name) > 0),
ADD CONSTRAINT description_length_check CHECK (description IS NULL OR length(description) <= 1000);

-- Add coordinate validation constraints
ALTER TABLE public.models
ADD CONSTRAINT latitude_range_check CHECK (latitude >= -90 AND latitude <= 90),
ADD CONSTRAINT longitude_range_check CHECK (longitude >= -180 AND longitude <= 180);

-- Create validation trigger function
CREATE OR REPLACE FUNCTION public.validate_model_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trim whitespace
  NEW.name = trim(NEW.name);
  IF NEW.description IS NOT NULL THEN
    NEW.description = trim(NEW.description);
  END IF;
  
  -- Additional validation
  IF length(NEW.name) = 0 THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to models table
DROP TRIGGER IF EXISTS validate_model_data_trigger ON public.models;
CREATE TRIGGER validate_model_data_trigger
BEFORE INSERT OR UPDATE ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.validate_model_data();