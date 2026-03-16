-- Adiciona o campo de forma de pagamento na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- Comentário: Valores suportados: 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'dinheiro', 'transferencia', 'parcelado', 'outro'
