-- Adiciona a coluna de telefone na tabela de perfis (telefone padrão do parceiro/cliente)
ALTER TABLE profiles ADD COLUMN phone text;

-- Adiciona a coluna de telefone customizado para o pacote/produto na tabela de afiliações
ALTER TABLE partner_products ADD COLUMN redirect_phone text;
