-- Adicionar coluna agent_type à tabela generated_reports
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type 
ON generated_reports(agent_type);

-- Adicionar índice composto para buscar por contrato e tipo de agente
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_agent 
ON generated_reports(contract_id, agent_type);