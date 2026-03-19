-- Migração para adicionar identificação de captador aos leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS captador_id uuid REFERENCES public.profiles(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_leads_captador_id ON public.leads(captador_id);

-- Nova política para permitir que Vendedores vejam leads captados por seus captadores
-- (O SQL anterior já permitia ver via rede, mas esta é mais direta via captador_id)
CREATE POLICY "Vendedores podem ver leads de seus captadores"
ON public.leads FOR SELECT
TO authenticated
USING (
  auth.uid() = partner_id OR 
  auth.uid() = captador_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = public.leads.captador_id 
    AND profiles.referred_by = auth.uid()
  )
);

-- Política para permitir que captadores vejam o que captaram
CREATE POLICY "Captadores podem ver seus próprios leads captados"
ON public.leads FOR SELECT
TO authenticated
USING (captador_id = auth.uid());
