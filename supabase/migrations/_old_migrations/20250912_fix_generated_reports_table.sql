-- Adicionar coluna contract_id à tabela generated_reports se não existir
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

-- Adicionar coluna agent_type à tabela generated_reports se não existir
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Adicionar coluna metadata se não existir
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Adicionar coluna status se não existir
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generated';

-- Atualizar registros existentes que tenham agent_type no metadata
UPDATE generated_reports 
SET agent_type = metadata->>'agent_type'
WHERE metadata IS NOT NULL 
AND metadata->>'agent_type' IS NOT NULL 
AND agent_type IS NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type 
ON generated_reports(agent_type);

-- Criar índice para metadata
CREATE INDEX IF NOT EXISTS idx_generated_reports_metadata 
ON generated_reports USING gin (metadata);

-- Criar índice para contract_id
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_id 
ON generated_reports(contract_id);

-- Criar índice composto para contract_id e agent_type
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_agent 
ON generated_reports(contract_id, agent_type);