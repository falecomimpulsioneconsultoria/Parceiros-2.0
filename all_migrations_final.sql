-- Migra????o para permitir Parceiros se afiliarem a Produtos
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

-- Pol??ticas de acesso
CREATE POLICY "Super Admins podem gerenciar afilia????es totalmente"
  ON partner_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Parceiros podem ver suas pr??prias afilia????es"
  ON partner_products
  FOR SELECT
  USING (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem criar suas pr??prias afilia????es"
  ON partner_products
  FOR INSERT
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem deletar (desafiliar-se)"
  ON partner_products
  FOR DELETE
  USING (auth.uid() = partner_id);
-- Adiciona a coluna de telefone na tabela de perfis (telefone padr??o do parceiro/cliente)
ALTER TABLE profiles ADD COLUMN phone text;

-- Adiciona a coluna de telefone customizado para o pacote/produto na tabela de afilia????es
ALTER TABLE partner_products ADD COLUMN redirect_phone text;
-- Permite que qualquer pessoa (mesmo deslogada) possa criar um novo Lead via formul??rio de captura
-- O Supabase bloqueia inser????es an??nimas por padr??o se o RLS estiver ativo.
CREATE POLICY "Permitir insercao anonima de leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);
-- Permite que usu??rios com a role 'admin' tenham permiss??o de leitura, altera????o e exclus??o na tabela 'leads'.
-- O Supabase bloqueia a visualiza????o por padr??o se o RLS estiver ativo e se os dados n??o pertencerem ao usu??rio (se o id = partner_id n??o bater).

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
-- 1. Cria????o da tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  login_image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Habilitar RLS na tabela
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Pol??tica de leitura: todos podem ler as configura????es p??blicas (necess??rio para a tela de login)
CREATE POLICY "Configura????es s??o p??blicas para leitura"
ON system_settings FOR SELECT
TO public
USING (true);

-- Pol??tica de altera????o: apenas admins podem modificar
CREATE POLICY "Admins podem atualizar configura????es"
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

-- Garantir que a linha exista (inser????o inicial)
INSERT INTO system_settings (id, login_image_url) 
VALUES (1, null)
ON CONFLICT (id) DO NOTHING;

-- 2. Cria????o do Bucket de Storage (requer executar como superuser/admin no painel do Supabase)
-- (Opcional caso a plataforma crie manualmente)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Pol??ticas de Storage para o bucket 'assets'
-- Visualiza????o p??blica
CREATE POLICY "Imagens p??blicas"
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
-- 1. Adicionar nova coluna na tabela system_settings para os est??gios do Kanban
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lead_stages JSONB DEFAULT '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em Negocia????o", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb;

-- 2. Atualizar a linha existente com os valores iniciais (caso j?? exista e esteja nulo)
UPDATE system_settings 
SET lead_stages = '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em Negocia????o", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb
WHERE id = 1 AND lead_stages IS NULL;

-- 3. Remover restri????o de CHECK da coluna status na tabela leads (caso exista)
-- Identificar a constraint de check para a coluna status dinamicamente e remov??-la
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

-- Coment??rio: Valores suportados: 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'dinheiro', 'transferencia', 'parcelado', 'outro'
-- =====================================================
-- 08_lead_deals.sql
-- Tabela de neg??cios/produtos adquiridos por cliente
-- Permite um cliente ter m??ltiplos produtos
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

-- Parceiro: ver apenas seus pr??prios neg??cios
CREATE POLICY "Parceiro v?? seus pr??prios neg??cios"
  ON public.lead_deals FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: inserir seus pr??prios neg??cios
CREATE POLICY "Parceiro insere seus pr??prios neg??cios"
  ON public.lead_deals FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

-- Parceiro: atualizar seus pr??prios neg??cios
CREATE POLICY "Parceiro atualiza seus pr??prios neg??cios"
  ON public.lead_deals FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid());

-- Parceiro: excluir seus pr??prios neg??cios
CREATE POLICY "Parceiro exclui seus pr??prios neg??cios"
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

-- ??ndices para performance
CREATE INDEX IF NOT EXISTS idx_lead_deals_lead_id ON public.lead_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_partner_id ON public.lead_deals(partner_id);
-- =====================================================
-- 09_products_commission_value.sql
-- Adiciona o campo de comiss??o em valor fixo (R$)
-- commission_value substitui o uso de commission_rate (%)
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_value numeric(10,2) NOT NULL DEFAULT 0;

-- Popula com os valores calculados da commission_rate existente (se quiser migrar)
-- UPDATE public.products SET commission_value = ROUND(price * commission_rate / 100, 2);
-- =====================================================
-- 10_commissions_deal_id.sql
-- Adiciona deal_id na tabela commissions para evitar
-- comiss??es duplicadas por neg??cio fechado.
-- =====================================================

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.lead_deals(id) ON DELETE CASCADE;

-- ??ndice ??nico para evitar mais de uma comiss??o por deal
CREATE UNIQUE INDEX IF NOT EXISTS commissions_deal_id_unique
  ON public.commissions (deal_id)
  WHERE deal_id IS NOT NULL;
-- =====================================================
-- 11_network_leads_rls.sql
-- Permite que parceiros visualizem os leads e neg??cios
-- de sua rede (parceiros indicados por eles).
-- =====================================================

-- Pol??tica para a tabela 'leads'
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

-- Pol??tica para a tabela 'lead_deals'
CREATE POLICY "Parceiros podem ver neg??cios de sua rede"
ON public.lead_deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = public.lead_deals.partner_id
      AND public.profiles.referred_by = auth.uid()
  )
);
-- Migra????o para permitir m??ltiplos QRCodes por produto
-- V??ncula QRCodes a uma afilia????o espec??fica do parceiro

CREATE TABLE product_qrcodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_product_id uuid REFERENCES public.partner_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  redirect_phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrar dados existentes de partner_products para a nova tabela
-- Cria um QRCode "Padr??o" para cada afilia????o que j?? tinha um telefone
INSERT INTO product_qrcodes (partner_product_id, name, redirect_phone)
SELECT id, 'Padr??o', redirect_phone
FROM partner_products
WHERE redirect_phone IS NOT NULL;

-- (Opcional) Limpar a coluna antiga ap??s a migra????o
-- ALTER TABLE partner_products DROP COLUMN redirect_phone;

-- RLS (Row Level Security)
ALTER TABLE product_qrcodes ENABLE ROW LEVEL SECURITY;

-- Pol??ticas de acesso
-- Parceiros podem gerenciar seus pr??prios QRCodes
CREATE POLICY "Parceiros podem ver seus pr??prios QRCodes"
  ON product_qrcodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem criar seus pr??prios QRCodes"
  ON product_qrcodes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem deletar seus pr??prios QRCodes"
  ON product_qrcodes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem atualizar seus pr??prios QRCodes"
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
