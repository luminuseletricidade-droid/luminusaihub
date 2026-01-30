-- Migration: Add AI Processing Fields to contract_documents
-- Description: Adiciona campos para processamento LLM e armazenamento de insights de IA
-- Date: 2025-12-18
-- Purpose: Permitir que todos os documentos passem pela LLM para resumo e contexto do Chat AI

-- ==============================================
-- ADD AI PROCESSING COLUMNS TO contract_documents
-- ==============================================

-- Adicionar coluna content_extracted (texto extraído do PDF)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'content_extracted'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN content_extracted TEXT;
        RAISE NOTICE 'Coluna content_extracted adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna content_extracted já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna extracted_insights (resumo e insights da IA em JSONB)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'extracted_insights'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN extracted_insights JSONB;
        RAISE NOTICE 'Coluna extracted_insights adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna extracted_insights já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna extraction_method (método usado para extrair texto)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'extraction_method'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN extraction_method VARCHAR(50);
        RAISE NOTICE 'Coluna extraction_method adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna extraction_method já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna processing_status (status do processamento IA)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'processing_status'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Coluna processing_status adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna processing_status já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna processing_error (mensagem de erro se houver)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'processing_error'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN processing_error TEXT;
        RAISE NOTICE 'Coluna processing_error adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna processing_error já existe na tabela contract_documents';
    END IF;
END $$;

-- ==============================================
-- CREATE INDEX FOR FASTER QUERIES
-- ==============================================

-- Index para buscar documentos por status de processamento
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status
ON contract_documents(processing_status);

-- Index GIN para busca em extracted_insights (JSONB)
CREATE INDEX IF NOT EXISTS idx_contract_documents_extracted_insights
ON contract_documents USING GIN (extracted_insights);

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON COLUMN contract_documents.content_extracted IS 'Texto extraído do documento via OCR ou parser de PDF';
COMMENT ON COLUMN contract_documents.extracted_insights IS 'Resumo e insights gerados pela LLM em formato JSONB';
COMMENT ON COLUMN contract_documents.extraction_method IS 'Método utilizado para extrair o texto (pdfplumber, ocr, vision)';
COMMENT ON COLUMN contract_documents.processing_status IS 'Status do processamento: pending, processing, completed, error';
COMMENT ON COLUMN contract_documents.processing_error IS 'Mensagem de erro caso o processamento falhe';
