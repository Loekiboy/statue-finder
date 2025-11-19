-- Extend models table with additional fields for municipal artworks
ALTER TABLE public.models
ADD COLUMN IF NOT EXISTS artist text,
ADD COLUMN IF NOT EXISTS year text,
ADD COLUMN IF NOT EXISTS materials text,
ADD COLUMN IF NOT EXISTS credits text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS source_city text,
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS is_municipal boolean DEFAULT false;

-- Create index for faster lookups of municipal artworks
CREATE INDEX IF NOT EXISTS idx_models_municipal ON public.models(is_municipal, source_city);
CREATE INDEX IF NOT EXISTS idx_models_source ON public.models(source_id, source_city);