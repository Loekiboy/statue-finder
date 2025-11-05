-- Add last known location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_known_latitude double precision,
ADD COLUMN IF NOT EXISTS last_known_longitude double precision,
ADD COLUMN IF NOT EXISTS last_location_updated_at timestamp with time zone;