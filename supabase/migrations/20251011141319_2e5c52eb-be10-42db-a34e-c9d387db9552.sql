-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true);

-- Create table for 3D models
CREATE TABLE public.models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for models table
CREATE POLICY "Anyone can view models"
ON public.models
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload models"
ON public.models
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models"
ON public.models
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models"
ON public.models
FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for models bucket
CREATE POLICY "Anyone can view models"
ON storage.objects
FOR SELECT
USING (bucket_id = 'models');

CREATE POLICY "Authenticated users can upload models"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'models' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own models"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own models"
ON storage.objects
FOR DELETE
USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_models_updated_at
BEFORE UPDATE ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();