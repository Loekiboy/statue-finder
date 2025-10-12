-- Add thumbnail_url column to models table
ALTER TABLE models ADD COLUMN thumbnail_url TEXT;

-- Create storage bucket for model thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-thumbnails', 'model-thumbnails', true);

-- Create RLS policies for model thumbnails bucket
CREATE POLICY "Public Access to Model Thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'model-thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'model-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'model-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'model-thumbnails' AND auth.role() = 'authenticated');