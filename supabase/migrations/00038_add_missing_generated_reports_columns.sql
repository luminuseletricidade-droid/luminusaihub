-- Migration: Add missing columns to generated_reports
-- Description: Adiciona colunas contract_id, description e status que estavam faltando
-- Date: 2025-10-10
-- Relates to: Fix for "column generated_reports.contract_id does not exist"

-- ==============================================
-- ADD MISSING COLUMNS
-- ==============================================

-- Adicionar coluna contract_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'contract_id'
    ) THEN
        ALTER TABLE generated_reports
        ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Coluna contract_id adicionada à tabela generated_reports';
    ELSE
        RAISE NOTICE 'Coluna contract_id já existe na tabela generated_reports';
    END IF;
END $$;

-- Adicionar coluna description se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE generated_reports
        ADD COLUMN description TEXT;
        RAISE NOTICE 'Coluna description adicionada à tabela generated_reports';
    ELSE
        RAISE NOTICE 'Coluna description já existe na tabela generated_reports';
    END IF;
END $$;

-- Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE generated_reports
        ADD COLUMN status VARCHAR(50) DEFAULT 'generated';
        RAISE NOTICE 'Coluna status adicionada à tabela generated_reports';
    ELSE
        RAISE NOTICE 'Coluna status já existe na tabela generated_reports';
    END IF;
END $$;

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Índice para contract_id
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_id
ON generated_reports(contract_id);

-- Índice para status
CREATE INDEX IF NOT EXISTS idx_generated_reports_status
ON generated_reports(status);

-- Índice composto para contract_id + agent_type (queries comuns)
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_agent
ON generated_reports(contract_id, agent_type);

-- ==============================================
-- ADD COMMENTS
-- ==============================================

COMMENT ON COLUMN generated_reports.contract_id IS 'ID do contrato relacionado ao relatório';
COMMENT ON COLUMN generated_reports.description IS 'Descrição curta do relatório';
COMMENT ON COLUMN generated_reports.status IS 'Status do relatório (generated, draft, published, archived)';
