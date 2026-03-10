
-- Create storage bucket for hotel photos
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-fotos', 'hotel-fotos', true);

-- Create hotel photos table
CREATE TABLE public.hotel_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id INTEGER NOT NULL REFERENCES public.hoteis_orlando(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  legenda TEXT,
  is_capa BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.hotel_fotos ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view photos
CREATE POLICY "Anyone can view hotel photos" ON public.hotel_fotos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert hotel photos" ON public.hotel_fotos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos" ON public.hotel_fotos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own photos" ON public.hotel_fotos
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Storage policies for hotel-fotos bucket
CREATE POLICY "Authenticated users can upload hotel photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hotel-fotos');

CREATE POLICY "Anyone can view hotel photos storage" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'hotel-fotos');

CREATE POLICY "Authenticated users can delete hotel photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hotel-fotos');
