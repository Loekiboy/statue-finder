-- Create a table to track discovered models per user
CREATE TABLE IF NOT EXISTS public.discovered_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_id)
);

-- Enable Row Level Security
ALTER TABLE public.discovered_models ENABLE ROW LEVEL SECURITY;

-- Users can view their own discoveries
CREATE POLICY "Users can view their own discoveries"
ON public.discovered_models
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own discoveries
CREATE POLICY "Users can insert their own discoveries"
ON public.discovered_models
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_discovered_models_user_id ON public.discovered_models(user_id);
CREATE INDEX idx_discovered_models_model_id ON public.discovered_models(model_id);