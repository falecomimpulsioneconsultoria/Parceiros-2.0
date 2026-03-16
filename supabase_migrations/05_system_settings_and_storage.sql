-- 1. Criação da tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  login_image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Habilitar RLS na tabela
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura: todos podem ler as configurações públicas (necessário para a tela de login)
CREATE POLICY "Configurações são públicas para leitura"
ON system_settings FOR SELECT
TO public
USING (true);

-- Política de alteração: apenas admins podem modificar
CREATE POLICY "Admins podem atualizar configurações"
ON system_settings FOR UPDATE
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

-- Garantir que a linha exista (inserção inicial)
INSERT INTO system_settings (id, login_image_url) 
VALUES (1, null)
ON CONFLICT (id) DO NOTHING;

-- 2. Criação do Bucket de Storage (requer executar como superuser/admin no painel do Supabase)
-- (Opcional caso a plataforma crie manualmente)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o bucket 'assets'
-- Visualização pública
CREATE POLICY "Imagens públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Upload apenas para admins
CREATE POLICY "Admins podem fazer upload de assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Deletar apenas para admins
CREATE POLICY "Admins podem deletar assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
