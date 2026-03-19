-- Migração 18: Permissão pública limitada para atribuição de leads
-- Permite que a página de captura (anônima) verifique se um ID é de um parceiro e quem o indicou

-- 1. Política para permitir que usuários anônimos (anon) consultem apenas o necessário para atribuição
-- Nota: Como RLS filtra linhas e não colunas, limitamos a visibilidade apenas a parceiros.
-- Para maior segurança, o ideal seria uma RPC, mas uma política RLS para 'anon' em parceiros 
-- é a solução mais compatível com o código atual.

CREATE POLICY "Acesso público limitado para atribuição de leads"
ON public.profiles FOR SELECT
TO anon
USING (role = 'partner');

-- Comentário para documentar a finalidade
COMMENT ON POLICY "Acesso público limitado para atribuição de leads" ON public.profiles 
IS 'Permite que a página de captura identifique captadores e seus respectivos vendedores mesmo sem login.';
