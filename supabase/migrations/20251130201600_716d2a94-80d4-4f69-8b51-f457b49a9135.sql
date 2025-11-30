-- Create storage bucket for kunstwerk photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kunstwerk-photos', 'kunstwerk-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create policies for the kunstwerk-photos bucket
CREATE POLICY "Anyone can view kunstwerk photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'kunstwerk-photos');

CREATE POLICY "Authenticated users can upload kunstwerk photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kunstwerk-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own kunstwerk photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kunstwerk-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own kunstwerk photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'kunstwerk-photos' AND auth.uid()::text = (storage.foldername(name))[1]);