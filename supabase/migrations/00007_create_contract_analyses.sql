-- Migration: Enhance Contract Analyses
-- Description: Adiciona campos adicionais à tabela contract_analyses
-- Date: 2025-10-02

-- Adicionar colunas que faltam (tabela já foi criada no 00000_base_schema.sql)
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS contract_summary TEXT;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS key_terms JSONB;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS maintenance_requirements JSONB;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS risks_identified JSONB;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS recommendations JSONB;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS compliance_notes TEXT;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE contract_analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Renomear coluna analysis_result para content se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_analyses' AND column_name = 'analysis_result'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_analyses' AND column_name = 'content'
    ) THEN
        ALTER TABLE contract_analyses RENAME COLUMN analysis_result TO content;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_contract_analyses_contract_id ON contract_analyses(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_user_id ON contract_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_analysis_type ON contract_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_created_at ON contract_analyses(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_contract_analyses_updated_at ON contract_analyses;
CREATE TRIGGER update_contract_analyses_updated_at BEFORE UPDATE ON contract_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE contract_analyses IS 'Análises de contratos geradas pela IA';
COMMENT ON COLUMN contract_analyses.contract_summary IS 'Resumo do contrato';
COMMENT ON COLUMN contract_analyses.key_terms IS 'Termos chave identificados';
COMMENT ON COLUMN contract_analyses.maintenance_requirements IS 'Requisitos de manutenção extraídos';
COMMENT ON COLUMN contract_analyses.risks_identified IS 'Riscos identificados no contrato';
COMMENT ON COLUMN contract_analyses.recommendations IS 'Recomendações baseadas na análise';
