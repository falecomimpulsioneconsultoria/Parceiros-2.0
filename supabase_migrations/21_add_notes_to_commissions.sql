-- Migração para adicionar coluna de observações na tabela de comissões
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.commissions.notes IS 'Observações ou descrição da origem da comissão';
