-- Adicionar coluna agent_type à tabela generated_reports
ALTER TABLE generated_reports 
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type 
ON generated_reports(agent_type);