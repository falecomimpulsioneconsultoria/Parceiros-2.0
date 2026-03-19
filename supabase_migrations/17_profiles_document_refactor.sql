-- Migração para refinar identificação de parceiros (PF/PJ e Unicidade de CPF)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS person_type text DEFAULT 'PF' CHECK (person_type IN ('PF', 'PJ')),
DROP CONSTRAINT IF EXISTS profiles_cpf_unique,
ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);

-- Comentário: O Postgres permite múltiplos valores NULL em um índice UNIQUE, 
-- o que é ideal para usuários que ainda não preencheram o documento.
