-- Migration: Add payment_terms column to contracts
-- Description: Adiciona coluna payment_terms à tabela contracts
-- Date: 2025-10-10
-- Relates to: Fix for "Could not find the 'payment_terms' column of 'contracts' in the schema cache"

-- ==============================================
-- ADD payment_terms COLUMN
-- ==============================================

-- Adicionar coluna payment_terms se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name = 'payment_terms'
    ) THEN
        ALTER TABLE contracts ADD COLUMN payment_terms TEXT;
        RAISE NOTICE 'Coluna payment_terms adicionada à tabela contracts';
    ELSE
        RAISE NOTICE 'Coluna payment_terms já existe na tabela contracts';
    END IF;
END $$;

-- ==============================================
-- CREATE INDEX
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_contracts_payment_terms
ON contracts(payment_terms);

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON COLUMN contracts.payment_terms IS 'Termos de pagamento do contrato (ex: mensal, trimestral, à vista, etc)';
