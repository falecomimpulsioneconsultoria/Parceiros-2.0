-- Renomear perfil admin para "Impulsione Consultoria"
UPDATE public.profiles 
SET full_name = 'Impulsione Consultoria'
WHERE email = 'falecom.impulsioneconsultoria@gmail.com';

-- Garantir que o role seja admin se necessário (opcional, mas bom pra consistência)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'falecom.impulsioneconsultoria@gmail.com';
