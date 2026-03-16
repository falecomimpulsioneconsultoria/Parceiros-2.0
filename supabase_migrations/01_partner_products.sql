-- Migração para permitir Parceiros se afiliarem a Produtos
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

-- Políticas de acesso
CREATE POLICY "Super Admins podem gerenciar afiliações totalmente"
  ON partner_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Parceiros podem ver suas próprias afiliações"
  ON partner_products
  FOR SELECT
  USING (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem criar suas próprias afiliações"
  ON partner_products
  FOR INSERT
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Parceiros podem deletar (desafiliar-se)"
  ON partner_products
  FOR DELETE
  USING (auth.uid() = partner_id);
