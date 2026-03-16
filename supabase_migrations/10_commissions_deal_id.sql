-- =====================================================
-- 10_commissions_deal_id.sql
-- Adiciona deal_id na tabela commissions para evitar
-- comissões duplicadas por negócio fechado.
-- =====================================================

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.lead_deals(id) ON DELETE CASCADE;

-- Índice único para evitar mais de uma comissão por deal
CREATE UNIQUE INDEX IF NOT EXISTS commissions_deal_id_unique
  ON public.commissions (deal_id)
  WHERE deal_id IS NOT NULL;
