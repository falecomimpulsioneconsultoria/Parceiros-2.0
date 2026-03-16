-- =====================================================
-- 09_products_commission_value.sql
-- Adiciona o campo de comissão em valor fixo (R$)
-- commission_value substitui o uso de commission_rate (%)
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_value numeric(10,2) NOT NULL DEFAULT 0;

-- Popula com os valores calculados da commission_rate existente (se quiser migrar)
-- UPDATE public.products SET commission_value = ROUND(price * commission_rate / 100, 2);
