-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text;

-- Create unique index for usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON public.profiles (LOWER(username));

-- Update RLS policy for discovered_models to allow authenticated users to view all discoveries
DROP POLICY IF EXISTS "Users can view their own discoveries" ON public.discovered_models;

CREATE POLICY "Authenticated users can view all discoveries"
ON public.discovered_models
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read all profiles for leaderboard purposes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);