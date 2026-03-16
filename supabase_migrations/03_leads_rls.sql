-- Permite que qualquer pessoa (mesmo deslogada) possa criar um novo Lead via formulário de captura
-- O Supabase bloqueia inserções anônimas por padrão se o RLS estiver ativo.
CREATE POLICY "Permitir insercao anonima de leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);
