-- Add show_nijmegen_statues column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_nijmegen_statues boolean NOT NULL DEFAULT true;