-- Add slideshow_enabled column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS slideshow_enabled BOOLEAN DEFAULT true;