-- 1. Adicionar nova coluna na tabela system_settings para os estágios do Kanban
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS lead_stages JSONB DEFAULT '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em Negociação", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb;

-- 2. Atualizar a linha existente com os valores iniciais (caso já exista e esteja nulo)
UPDATE system_settings 
SET lead_stages = '[
  {"id": "lead", "name": "Lead", "color": "#3b82f6"},
  {"id": "negociacao", "name": "Em Negociação", "color": "#f59e0b"},
  {"id": "fechado", "name": "Fechado", "color": "#10b981"},
  {"id": "perdido", "name": "Perdido", "color": "#ef4444"}
]'::jsonb
WHERE id = 1 AND lead_stages IS NULL;

-- 3. Remover restrição de CHECK da coluna status na tabela leads (caso exista)
-- Identificar a constraint de check para a coluna status dinamicamente e removê-la
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
