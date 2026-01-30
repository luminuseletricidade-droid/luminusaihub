-- Migration: Add missing columns to contract_documents
-- Description: Adiciona colunas faltantes necessárias para salvar documentos completos
-- Date: 2025-10-10
-- Relates to: Fix "Could not find the 'description' column of 'contract_documents' in the schema cache"

-- ==============================================
-- ADD MISSING COLUMNS TO contract_documents
-- ==============================================

-- Adicionar coluna description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN description TEXT;
        RAISE NOTICE 'Coluna description adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna description já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna file_path (caminho no storage)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'file_path'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN file_path TEXT;
        RAISE NOTICE 'Coluna file_path adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna file_path já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna file_name (nome do arquivo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN file_name VARCHAR(255);
        RAISE NOTICE 'Coluna file_name adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna file_name já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna file_type (tipo MIME do arquivo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'file_type'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN file_type VARCHAR(100);
        RAISE NOTICE 'Coluna file_type adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna file_type já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna file_size (tamanho em bytes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'file_size'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN file_size BIGINT;
        RAISE NOTICE 'Coluna file_size adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna file_size já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna metadata (dados adicionais em JSON)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Coluna metadata adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna metadata já existe na tabela contract_documents';
    END IF;
END $$;

-- Adicionar coluna user_id (usuário que fez upload)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_documents'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE contract_documents ADD COLUMN user_id UUID;
        RAISE NOTICE 'Coluna user_id adicionada à tabela contract_documents';
    ELSE
        RAISE NOTICE 'Coluna user_id já existe na tabela contract_documents';
    END IF;
END $$;

-- ==============================================
-- CREATE INDICES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_contract_documents_file_type
ON contract_documents(file_type);

CREATE INDEX IF NOT EXISTS idx_contract_documents_user_id
ON contract_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_contract_documents_file_name
ON contract_documents(file_name);

-- ==============================================
-- ADD COMMENTS
-- ==============================================

COMMENT ON COLUMN contract_documents.description IS 'Descrição do documento (ex: Contrato Original, Aditivo 1, etc)';
COMMENT ON COLUMN contract_documents.file_path IS 'Caminho completo do arquivo no storage bucket';
COMMENT ON COLUMN contract_documents.file_name IS 'Nome original do arquivo enviado';
COMMENT ON COLUMN contract_documents.file_type IS 'Tipo MIME do arquivo (ex: application/pdf)';
COMMENT ON COLUMN contract_documents.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN contract_documents.metadata IS 'Metadados adicionais do arquivo em formato JSON';
COMMENT ON COLUMN contract_documents.user_id IS 'ID do usuário que fez o upload do documento';

-- ==============================================
-- LOG SUCCESS
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Colunas adicionadas à tabela contract_documents';
    RAISE NOTICE '📋 Colunas: description, file_path, file_name, file_type, file_size, metadata, user_id';
END $$;
