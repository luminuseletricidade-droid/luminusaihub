-- Migration: Add Contract Extraction Fields
-- Description: Adiciona todos os campos usados pela extração de PDF e dados denormalizados
-- Date: 2025-10-02

-- Campos do Cliente (denormalizados)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_legal_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_cnpj TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_city TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_state TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_zip_code TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contact_person TEXT;

-- Detalhes do Contrato
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_number TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2);

-- Equipamentos Adicionais
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_power TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_voltage TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_quantity INTEGER;

-- Termos Contratuais
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_cnpj TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS automatic_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reajustment_index TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fines_late_payment_percentage DECIMAL(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_fine_percentage DECIMAL(5,2);

-- Extração de Texto
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_contracts_client_cnpj ON contracts(client_cnpj);
CREATE INDEX IF NOT EXISTS idx_contracts_extracted_text_search ON contracts USING GIN (to_tsvector('portuguese', coalesce(extracted_text, '')));
CREATE INDEX IF NOT EXISTS idx_contracts_extraction_metadata ON contracts USING GIN (extraction_metadata);

-- Comentários
COMMENT ON COLUMN contracts.client_legal_name IS 'Razão social do cliente (denormalizado)';
COMMENT ON COLUMN contracts.extracted_text IS 'Texto completo extraído do PDF do contrato';
COMMENT ON COLUMN contracts.extraction_metadata IS 'Metadados da extração (páginas, confiança, etc)';
