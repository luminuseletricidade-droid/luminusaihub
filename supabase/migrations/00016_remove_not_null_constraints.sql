-- Migration: Remove NOT NULL Constraints
-- Description: Remove constraints NOT NULL que impedem inserções válidas
-- Date: 2025-10-02

-- EQUIPMENT: Verifica e remove NOT NULL de name se a coluna existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'equipment' AND column_name = 'name'
    ) THEN
        ALTER TABLE equipment ALTER COLUMN name DROP NOT NULL;
    END IF;
END $$;

-- CONTRACT_DOCUMENTS: Verifica e remove NOT NULL de file_path se a coluna existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'file_path'
    ) THEN
        ALTER TABLE contract_documents ALTER COLUMN file_path DROP NOT NULL;
    END IF;
END $$;

-- CONTRACT_DOCUMENTS: Verifica e remove NOT NULL de file_name se a coluna existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'file_name'
    ) THEN
        ALTER TABLE contract_documents ALTER COLUMN file_name DROP NOT NULL;
    END IF;
END $$;

-- Garantir que pelo menos um dos campos de path existe em inserts futuros
-- Se file_path é NULL, usar storage_path (se ambas colunas existirem)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'file_path'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'storage_path'
    ) THEN
        UPDATE contract_documents
        SET file_path = COALESCE(file_path, storage_path, '')
        WHERE file_path IS NULL;
    END IF;
END $$;

-- Se file_name é NULL, usar document_name (se ambas colunas existirem)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'file_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'document_name'
    ) THEN
        UPDATE contract_documents
        SET file_name = COALESCE(file_name, document_name, 'Documento sem nome')
        WHERE file_name IS NULL;
    END IF;
END $$;
