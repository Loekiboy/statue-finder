-- Add show_osm_statues setting to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_osm_statues BOOLEAN NOT NULL DEFAULT true;