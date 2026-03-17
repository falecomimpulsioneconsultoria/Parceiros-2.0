-- =====================================================
-- SCRIPT DE LIMPEZA DE DADOS (RESET)
-- ATENCÃO: Este comando apaga os dados permanentemente!
-- =====================================================

-- 1. Limpar Leads, Negócios e Comissões (Dados transacionais)
TRUNCATE TABLE public.commissions CASCADE;
TRUNCATE TABLE public.lead_deals CASCADE;
TRUNCATE TABLE public.leads CASCADE;

-- 2. Limpar QRCodes e Afiliações
TRUNCATE TABLE public.product_qrcodes CASCADE;
TRUNCATE TABLE public.partner_products CASCADE;

-- 3. (OPCIONAL) Limpar Produtos
-- Remova o "--" da linha abaixo se quiser apagar os produtos também:
-- TRUNCATE TABLE public.products CASCADE;

-- 4. (OPCIONAL) Limpar Usuários/Perfis (Exceto Admins)
-- Remova o "--" da linha abaixo se quiser apagar os usuários parceiros:
-- DELETE FROM public.profiles WHERE role != 'admin';

-- DICA: Se você quiser apagar TUDO e recomeçar do zero (incluindo admins), 
-- use TRUNCATE TABLE public.profiles CASCADE; (ISSO VAI TE DESLOGAR)
