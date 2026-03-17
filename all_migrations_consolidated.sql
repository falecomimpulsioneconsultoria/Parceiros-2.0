-- MigraÃ§Ã£o para permitir Parceiros se afiliarem a Produtos
-- Execute no Editor SQL do seu painel do Supabase

CREATE TABLE partner_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(partner_id, product_id)
);

-- RLS (Row Level Security)
ALTER TABLE partner_products ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso
CREATE POLICY "Super Admins podem gerenciar afiliaÃ§Ãµes totalmente"
  ON partner_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Parceiros podem ver suas prÃ³prias afiliaÃ§Ãµes"
  ON partner_products
  FOR SELECT
  USING (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem criar suas prÃ³prias afiliaÃ§Ãµes"
  ON partner_products
  FOR INSERT
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem deletar (desafiliar-se)"
  ON partner_products
  FOR DELETE
  USING (auth.uid() = partner_id);
-- Adiciona a coluna de telefone na tabela de perfis (telefone padrÃ£o do parceiro/cliente)
ALTER TABLE profiles ADD COLUMN phone text;

-- Adiciona a coluna de telefone customizado para o pacote/produto na tabela de afiliaÃ§Ãµes
ALTER TABLE partner_products ADD COLUMN redirect_phone text;
-- Permite que qualquer pessoa (mesmo deslogada) possa criar um novo Lead via formulÃ¡rio de captura
-- O Supabase bloqueia inserÃ§Ãµes anÃ´nimas por padrÃ£o se o RLS estiver ativo.
CREATE POLICY "Permitir insercao anonima de leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);
-- Permite que usuÃ¡rios com a role 'admin' tenham permissÃ£o de leitura, alteraÃ§Ã£o e exclusÃ£o na tabela 'leads'.
-- O Supabase bloqueia a visualizaÃ§Ã£o por padrÃ£o se o RLS estiver ativo e se os dados nÃ£o pertencerem ao usuÃ¡rio (se o id = partner_id nÃ£o bater).

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
-- 1. CriaÃ§Ã£o da tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  login_image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Habilitar RLS na tabela
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica de leitura: todos podem ler as configuraÃ§Ãµes pÃºblicas (necessÃ¡rio para a tela de login)
CREATE POLICY "ConfiguraÃ§Ãµes sÃ£o pÃºblicas para leitura"
ON system_settings FOR SELECT
TO public
USING (true);

-- PolÃ­tica de alteraÃ§Ã£o: apenas admins podem modificar
CREATE POLICY "Admins podem atualizar configuraÃ§Ãµes"
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

-- Garantir que a linha exista (inserÃ§Ã£o inicial)
INSERT INTO system_settings (id, login_image_url) 
VALUES (1, null)
ON CONFLICT (id) DO NOTHING;

-- 2. CriaÃ§Ã£o do Bucket de Storage (requer executar como superuser/admin no painel do Supabase)
-- (Opcional caso a plataforma crie manualmente)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- PolÃ­ticas de Storage para o bucket 'assets'
-- VisualizaÃ§Ã£o pÃºblica
CREATE POLICY "Imagens pÃºblicas"
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
-- 1. Adicionar nova coluna na tabela system_settings para os estÃ¡gios do Kanban
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lead_stages JSONB DEFAULT '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em NegociaÃ§Ã£o", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb;

-- 2. Atualizar a linha existente com os valores iniciais (caso jÃ¡ exista e esteja nulo)
UPDATE system_settings 
SET lead_stages = '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em NegociaÃ§Ã£o", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb
WHERE id = 1 AND lead_stages IS NULL;

-- 3. Remover restriÃ§Ã£o de CHECK da coluna status na tabela leads (caso exista)
-- Identificar a constraint de check para a coluna status dinamicamente e removÃª-la
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  JOIN pg_class ON conrelid = pg_class.oid
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE relname = 'leads' AND nspname = 'public' 
    AND contype = 'c' -- Check constraint
    AND pg_get_constraintdef(pg_constraint.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.leads DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;
-- Adiciona o campo de forma de pagamento na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- ComentÃ¡rio: Valores suportados: 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'dinheiro', 'transferencia', 'parcelado', 'outro'
-- =====================================================
-- 08_lead_deals.sql
-- Tabela de negÃ³cios/produtos adquiridos por cliente
-- Permite um cliente ter mÃºltiplos produtos
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

-- Parceiro: ver apenas seus prÃ³prios negÃ³cios
CREATE POLICY "Parceiro vÃª seus prÃ³prios negÃ³cios"
  ON public.lead_deals FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: inserir seus prÃ³prios negÃ³cios
CREATE POLICY "Parceiro insere seus prÃ³prios negÃ³cios"
  ON public.lead_deals FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Parceiro: atualizar seus prÃ³prios negÃ³cios
CREATE POLICY "Parceiro atualiza seus prÃ³prios negÃ³cios"
  ON public.lead_deals FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: excluir seus prÃ³prios negÃ³cios
CREATE POLICY "Parceiro exclui seus prÃ³prios negÃ³cios"
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

-- Ãndices para performance
CREATE INDEX IF NOT EXISTS idx_lead_deals_lead_id ON public.lead_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_partner_id ON public.lead_deals(partner_id);
-- =====================================================
-- 09_products_commission_value.sql
-- Adiciona o campo de comissÃ£o em valor fixo (R$)
-- commission_value substitui o uso de commission_rate (%)
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_value numeric(10,2) NOT NULL DEFAULT 0;

-- Popula com os valores calculados da commission_rate existente (se quiser migrar)
-- UPDATE public.products SET commission_value = ROUND(price * commission_rate / 100, 2);
-- =====================================================
-- 10_commissions_deal_id.sql
-- Adiciona deal_id na tabela commissions para evitar
-- comissÃµes duplicadas por negÃ³cio fechado.
-- =====================================================

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.lead_deals(id) ON DELETE CASCADE;

-- Ãndice Ãºnico para evitar mais de uma comissÃ£o por deal
CREATE UNIQUE INDEX IF NOT EXISTS commissions_deal_id_unique
  ON public.commissions (deal_id)
  WHERE deal_id IS NOT NULL;
-- =====================================================
-- 11_network_leads_rls.sql
-- Permite que parceiros visualizem os leads e negÃ³cios
-- de sua rede (parceiros indicados por eles).
-- =====================================================

-- PolÃ­tica para a tabela 'leads'
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

-- PolÃ­tica para a tabela 'lead_deals'
CREATE POLICY "Parceiros podem ver negÃ³cios de sua rede"
ON public.lead_deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = public.lead_deals.partner_id
      AND public.profiles.referred_by = auth.uid()
  )
);
-- MigraÃ§Ã£o para permitir mÃºltiplos QRCodes por produto
-- VÃ­ncula QRCodes a uma afiliaÃ§Ã£o especÃ­fica do parceiro

CREATE TABLE product_qrcodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_product_id uuid REFERENCES public.partner_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  redirect_phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrar dados existentes de partner_products para a nova tabela
-- Cria um QRCode "PadrÃ£o" para cada afiliaÃ§Ã£o que jÃ¡ tinha um telefone
INSERT INTO product_qrcodes (partner_product_id, name, redirect_phone)
SELECT id, 'PadrÃ£o', redirect_phone
FROM partner_products
WHERE redirect_phone IS NOT NULL;

-- (Opcional) Limpar a coluna antiga apÃ³s a migraÃ§Ã£o
-- ALTER TABLE partner_products DROP COLUMN redirect_phone;

-- RLS (Row Level Security)
ALTER TABLE product_qrcodes ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso
-- Parceiros podem gerenciar seus prÃ³prios QRCodes
CREATE POLICY "Parceiros podem ver seus prÃ³prios QRCodes"
  ON product_qrcodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem criar seus prÃ³prios QRCodes"
  ON product_qrcodes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem deletar seus prÃ³prios QRCodes"
  ON product_qrcodes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem atualizar seus prÃ³prios QRCodes"
  ON product_qrcodes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );
