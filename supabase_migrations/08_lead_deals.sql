-- =====================================================
-- 08_lead_deals.sql
-- Tabela de negócios/produtos adquiridos por cliente
-- Permite um cliente ter múltiplos produtos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lead_deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Lead',
  value numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.lead_deals ENABLE ROW LEVEL SECURITY;

-- Parceiro: ver apenas seus próprios negócios
CREATE POLICY "Parceiro vê seus próprios negócios"
  ON public.lead_deals FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: inserir seus próprios negócios
CREATE POLICY "Parceiro insere seus próprios negócios"
  ON public.lead_deals FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Parceiro: atualizar seus próprios negócios
CREATE POLICY "Parceiro atualiza seus próprios negócios"
  ON public.lead_deals FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: excluir seus próprios negócios
CREATE POLICY "Parceiro exclui seus próprios negócios"
  ON public.lead_deals FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

-- Admin: acesso total
CREATE POLICY "Admin acesso total em lead_deals"
  ON public.lead_deals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_deals_lead_id ON public.lead_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_partner_id ON public.lead_deals(partner_id);
