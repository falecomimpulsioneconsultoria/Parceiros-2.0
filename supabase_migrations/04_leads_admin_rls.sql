-- Permite que usuários com a role 'admin' tenham permissão de leitura, alteração e exclusão na tabela 'leads'.
-- O Supabase bloqueia a visualização por padrão se o RLS estiver ativo e se os dados não pertencerem ao usuário (se o id = partner_id não bater).

CREATE POLICY "Admins podem ver todos os leads"
ON leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins podem alterar todos os leads"
ON leads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins podem excluir todos os leads"
ON leads FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
