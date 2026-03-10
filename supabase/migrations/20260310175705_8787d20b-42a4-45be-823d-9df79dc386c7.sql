
-- Allow anonymous users to view hotels (for public quotes)
CREATE POLICY "Anon can view hotels for public quotes" ON public.hoteis_orlando
  FOR SELECT TO anon USING (true);

-- Allow anonymous users to view hotel photos (for public quotes)
CREATE POLICY "Anon can view hotel photos for public quotes" ON public.hotel_fotos
  FOR SELECT TO anon USING (true);
