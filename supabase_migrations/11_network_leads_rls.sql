-- =====================================================
-- 11_network_leads_rls.sql
-- Permite que parceiros visualizem os leads e negócios
-- de sua rede (parceiros indicados por eles).
-- =====================================================

-- Política para a tabela 'leads'
CREATE POLICY "Parceiros podem ver leads de sua rede"
ON public.leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = public.leads.partner_id
      AND public.profiles.referred_by = auth.uid()
  )
);

-- Política para a tabela 'lead_deals'
CREATE POLICY "Parceiros podem ver negócios de sua rede"
ON public.lead_deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = public.lead_deals.partner_id
      AND public.profiles.referred_by = auth.uid()
  )
);
