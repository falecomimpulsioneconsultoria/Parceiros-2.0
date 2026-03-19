-- Migração para adicionar identificação de captador aos negócios (lead_deals)
ALTER TABLE public.lead_deals ADD COLUMN IF NOT EXISTS captador_id uuid REFERENCES public.profiles(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_lead_deals_captador_id ON public.lead_deals(captador_id);

-- Política para permitir que Vendedores vejam negócios captados por seus captadores
DROP POLICY IF EXISTS "Vendedores podem ver negócios de seus captadores" ON public.lead_deals;
CREATE POLICY "Vendedores podem ver negócios de seus captadores"
ON public.lead_deals FOR SELECT
TO authenticated
USING (
  auth.uid() = partner_id OR 
  auth.uid() = captador_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = public.lead_deals.captador_id 
    AND profiles.referred_by = auth.uid()
  )
);

-- Política para permitir inserção pública (anônima) durante a captura
DROP POLICY IF EXISTS "Permitir inserção anônima de negócios" ON public.lead_deals;
CREATE POLICY "Permitir inserção anônima de negócios"
ON public.lead_deals FOR INSERT
TO public
WITH CHECK (true);
