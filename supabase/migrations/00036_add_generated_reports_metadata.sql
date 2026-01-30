-- Migration: Add metadata column to generated_reports
-- Description: Adiciona coluna metadata (JSONB) à tabela generated_reports
-- Date: 2025-10-10
-- Relates to: Fix for "column generated_reports.metadata does not exist"

-- ==============================================
-- ADD METADATA COLUMN
-- ==============================================

-- Adicionar coluna metadata se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Coluna metadata adicionada à tabela generated_reports';
    ELSE
        RAISE NOTICE 'Coluna metadata já existe na tabela generated_reports';
    END IF;
END $$;

-- ==============================================
-- CREATE INDEX FOR PERFORMANCE
-- ==============================================

-- Criar índice GIN para queries JSONB eficientes
CREATE INDEX IF NOT EXISTS idx_generated_reports_metadata
ON generated_reports USING gin (metadata);

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON COLUMN generated_reports.metadata IS 'Metadados adicionais do relatório em formato JSON (ex: filtros, parâmetros, configurações)';
