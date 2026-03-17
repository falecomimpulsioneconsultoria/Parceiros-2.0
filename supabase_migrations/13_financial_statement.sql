-- Adicionar coluna type na tabela commissions para diferenciar crédito (comissão) de débito (saque)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commissions' AND column_name = 'type') THEN
        ALTER TABLE commissions ADD COLUMN type TEXT CHECK (type IN ('credit', 'debit')) DEFAULT 'credit';
    END IF;
END $$;

-- Adicionar coluna status na tabela lead_deals se for necessário ou usar o status existente
-- O usuário quer um botão "Faturado", então vamos garantir que 'Faturado' seja um status aceito ou adicionar uma flag.
-- Vamos usar o status existente na lógica do frontend.

-- Função para atualizar o saldo (balance) do perfil automaticamente quando uma comissão/saque é inserido
-- Isso garante integridade financeira e facilita o extrato.

CREATE OR REPLACE FUNCTION public.handle_commission_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'credit' THEN
        -- Comissão: Aumenta o saldo
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) + NEW.amount
        WHERE id = NEW.partner_id;
    ELSIF NEW.type = 'debit' THEN
        -- Saque: Diminui o saldo
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) - NEW.amount
        WHERE id = NEW.partner_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualização automática de saldo
DROP TRIGGER IF EXISTS on_commission_insert ON public.commissions;
CREATE TRIGGER on_commission_insert
    AFTER INSERT ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_commission_insert();
