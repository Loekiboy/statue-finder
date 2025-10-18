-- Add show_nijmegen_statues setting to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_nijmegen_statues BOOLEAN NOT NULL DEFAULT true;
