-- Create table to track discovered kunstwerken (municipal artworks from various cities)
CREATE TABLE public.discovered_kunstwerken (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kunstwerk_id TEXT NOT NULL,
  city TEXT NOT NULL,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  photo_url TEXT,
  UNIQUE(user_id, kunstwerk_id, city)
);

-- Enable Row Level Security
ALTER TABLE public.discovered_kunstwerken ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all discoveries" 
ON public.discovered_kunstwerken 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own discoveries" 
ON public.discovered_kunstwerken 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discoveries" 
ON public.discovered_kunstwerken 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_discovered_kunstwerken_user_id ON public.discovered_kunstwerken(user_id);
CREATE INDEX idx_discovered_kunstwerken_city ON public.discovered_kunstwerken(city);