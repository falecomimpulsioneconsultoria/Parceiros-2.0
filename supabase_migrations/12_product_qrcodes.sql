-- Migração para permitir múltiplos QRCodes por produto
-- Víncula QRCodes a uma afiliação específica do parceiro

CREATE TABLE product_qrcodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_product_id uuid REFERENCES public.partner_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  redirect_phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrar dados existentes de partner_products para a nova tabela
-- Cria um QRCode "Padrão" para cada afiliação que já tinha um telefone
INSERT INTO product_qrcodes (partner_product_id, name, redirect_phone)
SELECT id, 'Padrão', redirect_phone
FROM partner_products
WHERE redirect_phone IS NOT NULL;

-- (Opcional) Limpar a coluna antiga após a migração
-- ALTER TABLE partner_products DROP COLUMN redirect_phone;

-- RLS (Row Level Security)
ALTER TABLE product_qrcodes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Parceiros podem gerenciar seus próprios QRCodes
CREATE POLICY "Parceiros podem ver seus próprios QRCodes"
  ON product_qrcodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem criar seus próprios QRCodes"
  ON product_qrcodes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem deletar seus próprios QRCodes"
  ON product_qrcodes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM partner_products
      WHERE partner_products.id = product_qrcodes.partner_product_id
      AND partner_products.partner_id = auth.uid()
    )
  );

CREATE POLICY "Parceiros podem atualizar seus próprios QRCodes"
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
