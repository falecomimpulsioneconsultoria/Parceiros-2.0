-- Migração para suporte a Pagamento Parcelado (Boleto)
-- Adiciona suporte a parcelas e configurações de comissão por parcela

-- 1. Atualizar a tabela de produtos
ALTER TABLE public.products 
ADD COLUMN payment_type text DEFAULT 'avista' CHECK (payment_type IN ('avista', 'parcelado')),
ADD COLUMN installment_config jsonb DEFAULT NULL;

-- 2. Criar a tabela de parcelas de negócios
CREATE TABLE public.deal_installments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid REFERENCES public.lead_deals(id) ON DELETE CASCADE,
    installment_number integer NOT NULL, -- 0 para entrada, 1-12 para parcelas
    label text NOT NULL,
    value decimal(10,2) NOT NULL,
    status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado')),
    due_date timestamp with time zone,
    paid_at timestamp with time zone,
    commissions_config jsonb NOT NULL, -- Snapshot das comissões (vendedor, captador, indicador, lvl1, lvl2)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.deal_installments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Admins podem tudo em deal_installments"
    ON deal_installments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Parceiros podem ver suas próprias parcelas"
    ON deal_installments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lead_deals
            WHERE lead_deals.id = deal_installments.deal_id
            AND (lead_deals.partner_id = auth.uid() OR lead_deals.captador_id = auth.uid())
        )
    );

-- 3. Índices para performance
CREATE INDEX idx_deal_installments_deal_id ON deal_installments(deal_id);
CREATE INDEX idx_deal_installments_status ON deal_installments(status);
