
CREATE TABLE public.hoteis_orlando (
  id SERIAL PRIMARY KEY,
  nome_hotel TEXT NOT NULL,
  marca TEXT,
  categoria TEXT NOT NULL,
  publico_brasileiro TEXT NOT NULL CHECK (publico_brasileiro IN ('ALTO', 'MEDIO', 'BAIXO')),
  regiao TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT NOT NULL DEFAULT 'Orlando',
  estado TEXT NOT NULL DEFAULT 'FL',
  cep TEXT,
  pais TEXT NOT NULL DEFAULT 'Estados Unidos',
  distancia_disney_km NUMERIC,
  distancia_universal_km NUMERIC,
  distancia_outlet_km NUMERIC,
  cafe_da_manha_incluso BOOLEAN DEFAULT false,
  estacionamento_tipo TEXT DEFAULT 'gratuito',
  estacionamento_valor_diaria NUMERIC,
  tipo_quarto_familia TEXT,
  idiomas_staff TEXT,
  site_oficial TEXT,
  telefone TEXT,
  email_reservas TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.hoteis_orlando ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything with their own hotels
CREATE POLICY "Users can view all hotels" ON public.hoteis_orlando
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert hotels" ON public.hoteis_orlando
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hotels" ON public.hoteis_orlando
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own hotels" ON public.hoteis_orlando
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_hoteis_orlando_updated_at
  BEFORE UPDATE ON public.hoteis_orlando
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
