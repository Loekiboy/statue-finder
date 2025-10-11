-- Add latitude and longitude columns to models table
ALTER TABLE public.models 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Add a check constraint to ensure both lat/lng are provided together
ALTER TABLE public.models
ADD CONSTRAINT valid_location CHECK (
  (latitude IS NULL AND longitude IS NULL) OR 
  (latitude IS NOT NULL AND longitude IS NOT NULL)
);