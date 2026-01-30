-- Adicionar campo services na tabela contracts
ALTER TABLE public.contracts ADD COLUMN services JSONB DEFAULT '[]'::jsonb;