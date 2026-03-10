
CREATE TABLE public.ingressos_orlando (
  id serial PRIMARY KEY,
  nome_ingresso text NOT NULL,
  grupo text NOT NULL,
  categoria text DEFAULT '',
  dias_validade integer DEFAULT NULL,
  inclui_refeicao boolean DEFAULT false,
  preco_adulto numeric DEFAULT NULL,
  preco_crianca numeric DEFAULT NULL,
  observacoes text DEFAULT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingressos_orlando ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all tickets
CREATE POLICY "Users can view all tickets" ON public.ingressos_orlando
  FOR SELECT TO authenticated USING (true);

-- Anon can view tickets (for public quotes)
CREATE POLICY "Anon can view tickets" ON public.ingressos_orlando
  FOR SELECT TO anon USING (true);

-- Users can insert tickets
CREATE POLICY "Users can insert tickets" ON public.ingressos_orlando
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update own tickets
CREATE POLICY "Users can update own tickets" ON public.ingressos_orlando
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Users can delete own tickets
CREATE POLICY "Users can delete own tickets" ON public.ingressos_orlando
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add 'ticket' to the quote_item_type enum
ALTER TYPE public.quote_item_type ADD VALUE IF NOT EXISTS 'ticket';
