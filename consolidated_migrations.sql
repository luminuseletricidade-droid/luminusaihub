-- ================================================================================
-- LUMINUS AI HUB - CONSOLIDATED MIGRATIONS
-- ================================================================================
--
-- Description: This file consolidates all database migrations from 00000 to 00063
--              in sequential order for easy deployment to Supabase SQL Editor.
--
-- Generated: 2026-02-11
-- Total Migrations: 64 (00000 through 00063)
--
-- IMPORTANT NOTES:
-- - This file contains all schema changes, table creations, and data migrations
-- - Migrations are idempotent (can be run multiple times safely using IF NOT EXISTS)
-- - Execute in Supabase SQL Editor in a single transaction for consistency
-- - Review each section before executing in production
-- - Some migrations may have been superseded by later ones
--
-- EXECUTION:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Review the migrations carefully
-- 5. Execute the query
-- 6. Monitor the output for any errors or notices
--
-- STRUCTURE:
-- Each migration is clearly marked with:
--   - Migration number and filename
--   - Description of changes
--   - Separator lines for easy navigation
--
-- ================================================================================

-- Begin transaction for atomicity
BEGIN;

-- Set client encoding and timezone
SET client_encoding = 'UTF8';
SET timezone = 'America/Sao_Paulo';

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log start of migration
DO $$
BEGIN
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'Starting Luminus AI Hub consolidated migrations';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '================================================================================';
END $$;

-- ==============================================
-- = MIGRATION: 00000_base_schema.sql
-- ==============================================
-- Migration: Base Schema - Create all base tables
-- Description: Creates all fundamental tables needed by the system
-- Date: 2025-10-09
-- Order: Must run FIRST (00000)

-- ==============================================
-- CORE TABLES CREATION
-- ==============================================

-- CLIENT_STATUS TABLE
CREATE TABLE IF NOT EXISTS client_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name VARCHAR(255),
    cnpj VARCHAR(18),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    contact_person VARCHAR(255),
    status_id UUID REFERENCES client_status(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    client_id UUID REFERENCES clients(id),
    contract_number VARCHAR(255),
    client_name VARCHAR(255),
    value DECIMAL(15,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACT_DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    document_name VARCHAR(255),
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCE_STATUS TABLE
CREATE TABLE IF NOT EXISTS maintenance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCES TABLE
CREATE TABLE IF NOT EXISTS maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID,
    type VARCHAR(100),
    description TEXT,
    scheduled_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER_ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI_AGENTS TABLE
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GENERATED_REPORTS TABLE
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(255),
    content TEXT,
    report_type VARCHAR(100),
    agent_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENT_ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    document_path TEXT,
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI_PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    prediction_type VARCHAR(100),
    prediction_data JSONB,
    confidence DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI_GENERATED_PLANS TABLE
CREATE TABLE IF NOT EXISTS ai_generated_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    plan_type VARCHAR(100),
    plan_data JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AGENT_EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id),
    user_id UUID,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50),
    execution_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCE_CONTEXT TABLE
CREATE TABLE IF NOT EXISTS maintenance_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCE_CHECKLIST TABLE
CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    item VARCHAR(255),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCE_STATUS_HISTORY TABLE
CREATE TABLE IF NOT EXISTS maintenance_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACT_CONTEXT TABLE
CREATE TABLE IF NOT EXISTS contract_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACT_ANALYSES TABLE
CREATE TABLE IF NOT EXISTS contract_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100),
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AGENT_DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS agent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id),
    document_path TEXT,
    document_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLIENT_USERS TABLE
CREATE TABLE IF NOT EXISTS client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contract_id UUID,
    agent_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INSERT DEFAULT DATA
-- ==============================================

-- Insert default client statuses if they don't exist
INSERT INTO client_status (name) VALUES ('Ativo')
ON CONFLICT DO NOTHING;

INSERT INTO client_status (name) VALUES ('Inativo')
ON CONFLICT DO NOTHING;

INSERT INTO client_status (name) VALUES ('Suspenso')
ON CONFLICT DO NOTHING;

-- Insert default maintenance statuses if they don't exist
INSERT INTO maintenance_status (name) VALUES ('Pendente')
ON CONFLICT DO NOTHING;

INSERT INTO maintenance_status (name) VALUES ('Em Andamento')
ON CONFLICT DO NOTHING;

INSERT INTO maintenance_status (name) VALUES ('Concluída')
ON CONFLICT DO NOTHING;

INSERT INTO maintenance_status (name) VALUES ('Cancelada')
ON CONFLICT DO NOTHING;

-- ==============================================
-- CREATE UTILITY FUNCTIONS
-- ==============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- CREATE BASIC INDICES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);


-- ==============================================
-- = MIGRATION: 00001_add_client_name_to_contracts.sql
-- ==============================================
-- Migration: Add Client Name To Contracts
-- Description: Adiciona coluna client_name na tabela contracts para facilitar queries
-- Date: 2025-10-02

-- Adicionar coluna client_name se não existir
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Criar índice para busca por nome do cliente
CREATE INDEX IF NOT EXISTS idx_contracts_client_name ON contracts(client_name);

-- Documentação
COMMENT ON COLUMN contracts.client_name IS 'Nome do cliente (denormalizado para performance)';


-- ==============================================
-- = MIGRATION: 00002_fix_chat_sessions_contract_id.sql
-- ==============================================
-- Migration: Fix Chat Sessions Contract Id
-- Description: Altera contract_id de UUID para TEXT para permitir identificadores especiais como 'ai-agents'
-- Date: 2025-10-02

-- Remover a constraint de foreign key se existir
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_contract_id_fkey;

-- Alterar o tipo da coluna de UUID para TEXT
ALTER TABLE chat_sessions
ALTER COLUMN contract_id TYPE TEXT USING contract_id::TEXT;

-- Documentação
COMMENT ON COLUMN chat_sessions.contract_id IS 'ID do contrato (UUID) ou identificador especial (ex: ai-agents)';


-- ==============================================
-- = MIGRATION: 00003_create_storage_buckets.sql
-- ==============================================
-- Migration: Create Storage Buckets
-- Description: Cria buckets de storage no Supabase para documentos e arquivos
-- Date: 2025-10-02

-- Criar bucket para documentos de contratos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para documentos de manutenção
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-documents',
  'maintenance-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso (RLS)
-- Contract Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
CREATE POLICY "Users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
CREATE POLICY "Users can view their contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
CREATE POLICY "Users can update their contract documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;
CREATE POLICY "Users can delete their contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
CREATE POLICY "Users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
CREATE POLICY "Users can view their client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
CREATE POLICY "Users can update their client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
CREATE POLICY "Users can delete their client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
CREATE POLICY "Users can upload maintenance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
CREATE POLICY "Users can view their maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
CREATE POLICY "Users can update their maintenance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;
CREATE POLICY "Users can delete their maintenance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');


-- ==============================================
-- = MIGRATION: 00004_add_missing_client_columns.sql
-- ==============================================
-- Migration: Add Missing Client Columns
-- Description: Adiciona colunas faltantes na tabela clients
-- Date: 2025-10-02

-- Adicionar coluna contact_person
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- Adicionar coluna cnpj se não existir (algumas versões antigas não têm)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- Adicionar coluna status_id para relacionar com client_status
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);

-- Documentação
COMMENT ON COLUMN clients.contact_person IS 'Nome da pessoa de contato no cliente';
COMMENT ON COLUMN clients.status_id IS 'Referência para o status do cliente';


-- ==============================================
-- = MIGRATION: 00005_add_contract_extraction_fields.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00006_add_contract_document_fields.sql
-- ==============================================
-- Migration: Add Contract Document Fields
-- Description: Adiciona campos de processamento em contract_documents
-- Date: 2025-10-02

-- Adicionar campos de processamento
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS content_extracted TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Índice para buscar documentos por status
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status ON contract_documents(processing_status);

-- Comentários
COMMENT ON COLUMN contract_documents.content_extracted IS 'Conteúdo extraído e processado do documento';
COMMENT ON COLUMN contract_documents.processing_status IS 'Status: pending, processing, completed, error';


-- ==============================================
-- = MIGRATION: 00007_create_contract_analyses.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00008_add_cnpj_functions.sql
-- ==============================================
-- Migration: Add CNPJ Functions
-- Description: Adiciona funções para limpeza e validação de CNPJ
-- Date: 2025-10-02

-- Função para limpar CNPJ (remover caracteres não numéricos)
CREATE OR REPLACE FUNCTION clean_cnpj(cnpj_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF cnpj_input IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN regexp_replace(cnpj_input, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar formato do CNPJ
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    cleaned_cnpj TEXT;
BEGIN
    IF cnpj_input IS NULL THEN
        RETURN FALSE;
    END IF;

    cleaned_cnpj := clean_cnpj(cnpj_input);

    -- CNPJ deve ter exatamente 14 dígitos
    IF length(cleaned_cnpj) != 14 THEN
        RETURN FALSE;
    END IF;

    -- CNPJs inválidos conhecidos (todos dígitos iguais)
    IF cleaned_cnpj IN ('00000000000000', '11111111111111', '22222222222222',
                        '33333333333333', '44444444444444', '55555555555555',
                        '66666666666666', '77777777777777', '88888888888888',
                        '99999999999999') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Adicionar constraint de validação na tabela clients
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS chk_cnpj_format;

ALTER TABLE clients
ADD CONSTRAINT chk_cnpj_format
CHECK (cnpj IS NULL OR validate_cnpj(cnpj));

-- Comentários
COMMENT ON FUNCTION clean_cnpj(TEXT) IS 'Remove caracteres não numéricos do CNPJ';
COMMENT ON FUNCTION validate_cnpj(TEXT) IS 'Valida formato básico do CNPJ (14 dígitos, não pode ser sequência)';


-- ==============================================
-- = MIGRATION: 00009_fix_storage_policies.sql
-- ==============================================
-- Migration: Fix Storage Policies
-- Description: Recria políticas de storage para garantir que funcionem corretamente
-- Date: 2025-10-02

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;

-- Drop new policy names too (if they exist from previous runs)
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance documents" ON storage.objects;

-- Recriar políticas simplificadas (permite acesso a usuários autenticados)
-- Contract Documents
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can view contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can update contract documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
CREATE POLICY "Authenticated users can update client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents
DROP POLICY IF EXISTS "Authenticated users can upload maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload maintenance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can view maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can view maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can update maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can update maintenance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can delete maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete maintenance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');


-- ==============================================
-- = MIGRATION: 00011_ensure_client_status.sql
-- ==============================================
-- Migration: Enhance Client Status Table
-- Description: Adiciona campos adicionais à tabela client_status
-- Date: 2025-10-02

-- Adicionar colunas que faltam (tabela já foi criada no 00000_base_schema.sql)
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS color VARCHAR(7);
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE client_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar constraint UNIQUE em name se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_status_name_key'
    ) THEN
        ALTER TABLE client_status ADD CONSTRAINT client_status_name_key UNIQUE (name);
    END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_client_status_name ON client_status(name);

-- Habilitar RLS
ALTER TABLE client_status ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view client status" ON client_status;
DROP POLICY IF EXISTS "Users can insert client status" ON client_status;
DROP POLICY IF EXISTS "Users can update client status" ON client_status;
DROP POLICY IF EXISTS "Users can delete client status" ON client_status;
DROP POLICY IF EXISTS "All users can view client status" ON client_status;
DROP POLICY IF EXISTS "Only admins can manage client status" ON client_status;
DROP POLICY IF EXISTS "Authenticated users can view client status" ON client_status;
DROP POLICY IF EXISTS "Authenticated users can manage client status" ON client_status;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can view client status"
ON client_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage client status"
ON client_status FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Inserir status padrão se não existirem
INSERT INTO client_status (name, color, description, is_active)
SELECT 'Ativo', '#10B981', 'Cliente ativo', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Ativo')
UNION ALL
SELECT 'Inativo', '#EF4444', 'Cliente inativo', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Inativo')
UNION ALL
SELECT 'Prospecto', '#F59E0B', 'Cliente em prospecção', true
WHERE NOT EXISTS (SELECT 1 FROM client_status WHERE name = 'Prospecto');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_client_status_updated_at ON client_status;
CREATE TRIGGER update_client_status_updated_at
    BEFORE UPDATE ON client_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- = MIGRATION: 00012_add_missing_client_fields.sql
-- ==============================================
-- Migration: Add Missing Client Fields
-- Description: Adiciona colunas que faltam na tabela clients
-- Date: 2025-10-02

-- Adicionar colunas que podem estar faltando
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state);


-- ==============================================
-- = MIGRATION: 00013_add_contract_type.sql
-- ==============================================
-- Migration: Add Contract Type Column
-- Description: Adiciona coluna contract_type na tabela contracts
-- Date: 2025-10-02

-- Adicionar coluna contract_type se não existir
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Manutenção';

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);


-- ==============================================
-- = MIGRATION: 00014_make_generated_reports_user_id_nullable.sql
-- ==============================================
-- Make user_id nullable in generated_reports table
-- This allows reports to be generated even when user context is not available
ALTER TABLE generated_reports
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN generated_reports.user_id IS 'User who generated the report. Can be NULL for system-generated reports.';


-- ==============================================
-- = MIGRATION: 00015_complete_schema_fix.sql
-- ==============================================
-- Migration: Complete Schema Fix - All Missing Fields
-- Description: Adiciona TODOS os campos que faltam em todas as tabelas do sistema
-- Date: 2025-10-02
-- Author: Complete system analysis

-- ==============================================
-- CLIENTS TABLE - 12 insert fields, 8 update fields
-- ==============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES client_status(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- CONTRACTS TABLE - 45 insert fields + metadata
-- ==============================================
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_legal_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_city VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_state VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_zip_code VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contact_person VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS value DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Manutenção';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_number VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_model VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_location TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_brand VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_power VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_voltage VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_quantity INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supplier_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS automatic_renewal BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reajustment_index VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fines_late_payment_percentage DECIMAL(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_fine_percentage DECIMAL(5,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- EQUIPMENT TABLE - 9 insert fields
-- ==============================================
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    type VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    location TEXT,
    manufacturer VARCHAR(255),
    observations TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se a tabela já existir
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- CONTRACT_DOCUMENTS TABLE - 8 insert fields
-- ==============================================
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS content_extracted TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Manter compatibilidade com nomes antigos se existirem
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Sincronizar dados entre colunas antigas e novas se necessário
UPDATE contract_documents SET document_name = file_name WHERE document_name IS NULL AND file_name IS NOT NULL;
UPDATE contract_documents SET storage_path = file_path WHERE storage_path IS NULL AND file_path IS NOT NULL;
UPDATE contract_documents SET document_type = file_type WHERE document_type IS NULL AND file_type IS NOT NULL;

-- ==============================================
-- MAINTENANCES TABLE - 11 insert fields
-- ==============================================
CREATE TABLE IF NOT EXISTS maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID,
    type VARCHAR(100),
    description TEXT,
    scheduled_date DATE,
    scheduled_time TIME,
    status VARCHAR(50) DEFAULT 'pending',
    technician VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se a tabela já existir
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS technician VARCHAR(255);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==============================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status_id ON clients(status_id);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_client_cnpj ON contracts(client_cnpj);

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON equipment(contract_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);

-- Contract Documents
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON contract_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_contract_documents_document_type ON contract_documents(document_type);

-- Maintenances
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON maintenances(scheduled_date);

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================

-- Function para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_documents_updated_at ON contract_documents;
CREATE TRIGGER update_contract_documents_updated_at
    BEFORE UPDATE ON contract_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenances_updated_at ON maintenances;
CREATE TRIGGER update_maintenances_updated_at
    BEFORE UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- = MIGRATION: 00016_add_missing_equipment_fields.sql
-- ==============================================
-- Migration: Add Missing Equipment Fields
-- Description: Adiciona campos de equipamento que faltam na tabela contracts
-- Date: 2025-10-09

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_serial VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_year VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_condition VARCHAR(100);

-- Índice para performance em busca por número de série
CREATE INDEX IF NOT EXISTS idx_contracts_equipment_serial ON contracts(equipment_serial);


-- ==============================================
-- = MIGRATION: 00016_remove_not_null_constraints.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00017_add_contract_documents_category.sql
-- ==============================================
-- Migration: Add category column to contract_documents
-- Description: Adiciona coluna category para categorizar documentos
-- Date: 2025-10-02

-- Adicionar coluna category
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contract_documents_category ON contract_documents(category);

-- Atualizar category baseado em metadata se existir
UPDATE contract_documents
SET category = (metadata->>'category')::varchar
WHERE metadata IS NOT NULL
  AND metadata->>'category' IS NOT NULL
  AND (category IS NULL OR category = 'general');


-- ==============================================
-- = MIGRATION: 00018_complete_final_schema.sql
-- ==============================================
-- Migration: Complete Final Schema - ALL Missing Fields and Tables
-- Description: Adds ALL missing fields and creates ALL missing tables (DEFINITIVO)
-- Date: 2025-10-02
-- Author: Complete comprehensive analysis of entire project

-- ==============================================
-- ADD MISSING FIELDS TO EXISTING TABLES
-- ==============================================

-- CLIENTS TABLE - Add missing fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS observations TEXT;

-- CONTRACT_DOCUMENTS TABLE - Add missing fields (category já foi adicionado na migration 00017)
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- EQUIPMENT TABLE - Add missing field
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS installation_date DATE;

-- MAINTENANCES TABLE - Add missing fields
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);

-- Check if equipment_id exists and its type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenances' AND column_name = 'equipment_id'
    ) THEN
        ALTER TABLE maintenances ADD COLUMN equipment_id UUID;
    ELSE
        -- If exists but is VARCHAR, convert to UUID
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'maintenances'
            AND column_name = 'equipment_id'
            AND data_type = 'character varying'
        ) THEN
            -- Remove FK if exists
            ALTER TABLE maintenances DROP CONSTRAINT IF EXISTS maintenances_equipment_id_fkey;
            -- Change type to UUID
            ALTER TABLE maintenances ALTER COLUMN equipment_id TYPE UUID USING equipment_id::uuid;
        END IF;
    END IF;
END $$;

ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS status_id UUID;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS completed_date DATE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS contract_number VARCHAR(255);

-- Add check constraint for priority
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'maintenances_priority_check'
    ) THEN
        ALTER TABLE maintenances
        ADD CONSTRAINT maintenances_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add foreign keys if tables exist
DO $$
BEGIN
    -- Add equipment_id FK if equipment table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'maintenances_equipment_id_fkey'
        ) THEN
            ALTER TABLE maintenances
            ADD CONSTRAINT maintenances_equipment_id_fkey
            FOREIGN KEY (equipment_id) REFERENCES equipment(id);
        END IF;
    END IF;

    -- Add status_id FK if maintenance_status table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_status') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'maintenances_status_id_fkey'
        ) THEN
            ALTER TABLE maintenances
            ADD CONSTRAINT maintenances_status_id_fkey
            FOREIGN KEY (status_id) REFERENCES maintenance_status(id);
        END IF;
    END IF;
END $$;

-- ==============================================
-- CREATE MISSING TABLES
-- ==============================================

-- CONTRACT_SERVICES TABLE
CREATE TABLE IF NOT EXISTS contract_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50),
    duration INTEGER,
    price DECIMAL(15,2),
    is_included BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLIENT_DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    file_name TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing client_documents table
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- CHAT_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contract_id VARCHAR(255),
    agent_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MAINTENANCE_DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS maintenance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    file_name TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing maintenance_documents table
ALTER TABLE maintenance_documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE maintenance_documents ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- ==============================================
-- INDICES FOR PERFORMANCE
-- ==============================================

-- Clients - New field indices
CREATE INDEX IF NOT EXISTS idx_clients_website ON clients(website);

-- Maintenances - New field indices
CREATE INDEX IF NOT EXISTS idx_maintenances_priority ON maintenances(priority);
CREATE INDEX IF NOT EXISTS idx_maintenances_equipment_id ON maintenances(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status_id ON maintenances(status_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_completed_date ON maintenances(completed_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_frequency ON maintenances(frequency);

-- Contract Services indices
CREATE INDEX IF NOT EXISTS idx_contract_services_contract_id ON contract_services(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_user_id ON contract_services(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_frequency ON contract_services(frequency);

-- Client Documents indices
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON client_documents(category);

-- Chat Sessions indices
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract_id ON chat_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON chat_sessions(agent_id);

-- Chat Messages indices
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Maintenance Documents indices
CREATE INDEX IF NOT EXISTS idx_maintenance_documents_maintenance_id ON maintenance_documents(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_documents_category ON maintenance_documents(category);

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_contract_services_updated_at ON contract_services;
CREATE TRIGGER update_contract_services_updated_at
    BEFORE UPDATE ON contract_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_documents_updated_at ON client_documents;
CREATE TRIGGER update_client_documents_updated_at
    BEFORE UPDATE ON client_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_documents_updated_at ON maintenance_documents;
CREATE TRIGGER update_maintenance_documents_updated_at
    BEFORE UPDATE ON maintenance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_documents ENABLE ROW LEVEL SECURITY;

-- Contract Services policies
DROP POLICY IF EXISTS "Users can manage their contract services" ON contract_services;
CREATE POLICY "Users can manage their contract services"
ON contract_services FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Client Documents policies
DROP POLICY IF EXISTS "Users can manage client documents" ON client_documents;
CREATE POLICY "Users can manage client documents"
ON client_documents FOR ALL
TO authenticated
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))
WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Chat Sessions policies
DROP POLICY IF EXISTS "Users can manage their chat sessions" ON chat_sessions;
CREATE POLICY "Users can manage their chat sessions"
ON chat_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Chat Messages policies
DROP POLICY IF EXISTS "Users can manage their chat messages" ON chat_messages;
CREATE POLICY "Users can manage their chat messages"
ON chat_messages FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Maintenance Documents policies
DROP POLICY IF EXISTS "Users can manage maintenance documents" ON maintenance_documents;
CREATE POLICY "Users can manage maintenance documents"
ON maintenance_documents FOR ALL
TO authenticated
USING (maintenance_id IN (SELECT id FROM maintenances WHERE user_id = auth.uid()))
WITH CHECK (maintenance_id IN (SELECT id FROM maintenances WHERE user_id = auth.uid()));


-- ==============================================
-- = MIGRATION: 00019_add_contract_documents_name.sql
-- ==============================================
-- Migration: Add name column to contract_documents
-- Description: Adiciona coluna name para compatibilidade
-- Date: 2025-10-02

-- Adicionar coluna name (alias para document_name)
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Sincronizar dados entre name e document_name
UPDATE contract_documents
SET name = document_name
WHERE name IS NULL AND document_name IS NOT NULL;

UPDATE contract_documents
SET document_name = name
WHERE document_name IS NULL AND name IS NOT NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contract_documents_name ON contract_documents(name);


-- ==============================================
-- = MIGRATION: 00019_add_csv_support_to_buckets.sql
-- ==============================================
-- Adicionar suporte a todos os tipos de documentos nos buckets
-- EXCETO contract-documents que aceita APENAS PDF
-- Migration: 00019_add_csv_support_to_buckets.sql

-- Atualizar bucket client-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/html', 'application/rtf',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/xml', 'application/json'
]
WHERE id = 'client-documents';

-- Atualizar bucket contract-documents para aceitar APENAS PDF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'contract-documents';

-- Atualizar bucket maintenance-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/html', 'application/rtf',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/xml', 'application/json'
]
WHERE id = 'maintenance-documents';


-- ==============================================
-- = MIGRATION: 00020_add_maintenance_end_time.sql
-- ==============================================
-- Migration: Add end_time column to maintenances
-- Description: Adiciona coluna end_time para horário final da manutenção
-- Date: 2025-10-02

ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS end_time TIME;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_maintenances_end_time ON maintenances(end_time);


-- ==============================================
-- = MIGRATION: 00021_add_client_user_relationship.sql
-- ==============================================
-- Migration: Enhance Client-User Relationship Table
-- Description: Adiciona campos e funcionalidades à tabela client_users (tabela já criada no 00000_base_schema.sql)
-- Date: 2025-10-02

-- Adicionar coluna role se não existir
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner';
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_users_client_id_user_id_key'
    ) THEN
        ALTER TABLE client_users ADD CONSTRAINT client_users_client_id_user_id_key UNIQUE (client_id, user_id);
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_role ON client_users(role);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
    BEFORE UPDATE ON client_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios relacionamentos
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
CREATE POLICY "Users can view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Usuários podem criar relacionamentos para si mesmos
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
CREATE POLICY "Users can create their client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Apenas owners podem deletar relacionamentos
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;
CREATE POLICY "Owners can delete client relationships"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- Migrar dados existentes: criar relacionamento para clientes já existentes
INSERT INTO client_users (client_id, user_id, role)
SELECT id, user_id, 'owner'
FROM clients
WHERE user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Atualizar a constraint de CNPJ único para permitir compartilhamento
-- Remove a constraint única de CNPJ se existir
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_cnpj_key;

-- Criar índice não-único para CNPJ (permite duplicatas)
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj) WHERE cnpj IS NOT NULL;

-- Comentários para documentação
COMMENT ON TABLE client_users IS 'Relacionamento many-to-many entre clientes e usuários (multi-tenant)';
COMMENT ON COLUMN client_users.role IS 'Papel do usuário: owner (criador), editor (pode editar), viewer (apenas visualizar)';


-- ==============================================
-- = MIGRATION: 00022_fix_client_users_rls.sql
-- ==============================================
-- Migration: Fix Client Users RLS Policies
-- Description: Corrige políticas RLS para permitir criação de relacionamentos
-- Date: 2025-10-02

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;

-- Policy: Usuários podem ver seus próprios relacionamentos
CREATE POLICY "Users can view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Usuários autenticados podem criar relacionamentos para si mesmos
-- IMPORTANTE: user_id no INSERT deve ser igual ao auth.uid() atual
CREATE POLICY "Users can create their client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
);

-- Policy: Usuários podem atualizar seus relacionamentos
DROP POLICY IF EXISTS "Users can update their client relationships" ON client_users;
CREATE POLICY "Users can update their client relationships"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Apenas owners podem deletar relacionamentos
CREATE POLICY "Owners can delete client relationships"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- Comentários para documentação
COMMENT ON POLICY "Users can create their client relationships" ON client_users IS
'Permite que usuários autenticados criem relacionamentos apenas para si mesmos. O user_id no INSERT deve ser igual ao auth.uid() atual.';


-- ==============================================
-- = MIGRATION: 00023_debug_client_users_rls.sql
-- ==============================================
-- Migration: Debug and Fix Client Users RLS
-- Description: Adiciona logging e simplifica política para debug
-- Date: 2025-10-02

-- Primeiro, vamos temporariamente desabilitar RLS para testar
-- DROP todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can update their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;

-- Criar política mais permissiva para INSERT (para debug)
-- Permite que qualquer usuário autenticado crie relacionamentos
DROP POLICY IF EXISTS "Allow authenticated users to create client relationships" ON client_users;
CREATE POLICY "Allow authenticated users to create client relationships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de SELECT - ver todos os relacionamentos do usuário
DROP POLICY IF EXISTS "Allow users to view their client relationships" ON client_users;
CREATE POLICY "Allow users to view their client relationships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política de UPDATE - atualizar apenas seus relacionamentos
DROP POLICY IF EXISTS "Allow users to update their client relationships" ON client_users;
CREATE POLICY "Allow users to update their client relationships"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política de DELETE - deletar apenas seus relacionamentos
DROP POLICY IF EXISTS "Allow users to delete their client relationships" ON client_users;
CREATE POLICY "Allow users to delete their client relationships"
ON client_users FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Adicionar comentário explicativo
COMMENT ON POLICY "Allow authenticated users to create client relationships" ON client_users IS
'TEMPORÁRIO: Política permissiva para debug. TODO: Adicionar validação user_id = auth.uid() após confirmar que funciona.';


-- ==============================================
-- = MIGRATION: 00024_fix_contract_services_schema.sql
-- ==============================================
-- Migration: Fix Contract Services Schema
-- Description: Adiciona colunas faltantes na tabela contract_services
-- Date: 2025-10-02

-- Adicionar coluna service_name se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- Adicionar coluna description se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar coluna frequency se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS frequency VARCHAR(100);

-- Adicionar coluna duration se não existir
ALTER TABLE contract_services
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Atualizar service_name para contratos existentes que não têm
UPDATE contract_services
SET service_name = 'Serviço não especificado'
WHERE service_name IS NULL OR service_name = '';

-- Criar índice para service_name
CREATE INDEX IF NOT EXISTS idx_contract_services_service_name ON contract_services(service_name);

-- Comentários
COMMENT ON COLUMN contract_services.service_name IS 'Nome do serviço incluído no contrato';
COMMENT ON COLUMN contract_services.description IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN contract_services.frequency IS 'Frequência de execução do serviço (mensal, trimestral, etc)';
COMMENT ON COLUMN contract_services.duration IS 'Duração estimada do serviço em minutos';


-- ==============================================
-- = MIGRATION: 00025_fix_chat_sessions_agent_id.sql
-- ==============================================
-- Migration: Fix Chat Sessions Agent ID Type
-- Description: Muda agent_id de UUID para VARCHAR para suportar IDs como "contract-extractor"
-- Date: 2025-10-02

-- Primeiro, remover a foreign key constraint se existir
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_agent_id_fkey;

-- Alterar o tipo de agent_id de UUID para VARCHAR
ALTER TABLE chat_sessions
ALTER COLUMN agent_id TYPE VARCHAR(100) USING agent_id::VARCHAR;

-- Remover índice antigo se existir e criar novo
DROP INDEX IF EXISTS idx_chat_sessions_agent_id;
CREATE INDEX idx_chat_sessions_agent_id ON chat_sessions(agent_id);

-- Comentário explicativo
COMMENT ON COLUMN chat_sessions.agent_id IS
'ID do agente usado na sessão. Pode ser um identificador string como "contract-extractor" ou "general-chat". Não há FK pois agents não são armazenados no banco.';


-- ==============================================
-- = MIGRATION: 00026_fix_client_documents_upload_policy.sql
-- ==============================================
-- Adicionar política de INSERT para permitir upload no bucket client-documents
-- Migration: 00026_fix_client_documents_upload_policy.sql

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;

-- Criar política de INSERT para client-documents
CREATE POLICY "Users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');


-- ==============================================
-- = MIGRATION: 00026_set_default_timezone.sql
-- ==============================================
-- Migration: Set default timezone for Supabase database
-- Description: Configura timezone padrão para America/Sao_Paulo (UTC-3)
-- Created: 2025-01-03

-- ==============================================================================
-- CONFIGURAÇÃO DE TIMEZONE PADRÃO
-- ==============================================================================

-- 1. Configurar timezone padrão do banco de dados para America/Sao_Paulo
-- NOTA: Esta configuração afeta todas as sessões novas
ALTER DATABASE postgres SET timezone = 'America/Sao_Paulo';

-- 2. Aplicar timezone na sessão atual
SET timezone = 'America/Sao_Paulo';

-- 3. Criar função helper para garantir timezone em queries
CREATE OR REPLACE FUNCTION set_session_timezone()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE 'SET timezone = ''America/Sao_Paulo''';
END;
$$;

COMMENT ON FUNCTION set_session_timezone() IS
'Helper function para garantir que timezone está configurado corretamente na sessão';

-- 4. Verificar timezone atual (para debug)
DO $$
DECLARE
    current_tz text;
BEGIN
    SHOW timezone INTO current_tz;
    RAISE NOTICE '✅ Timezone configurado: %', current_tz;
END;
$$;

-- ==============================================================================
-- FUNÇÕES UTILITÁRIAS DE DATA/HORA COM TIMEZONE
-- ==============================================================================

-- Função para obter timestamp atual no timezone local
CREATE OR REPLACE FUNCTION now_local()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
    SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$$;

COMMENT ON FUNCTION now_local() IS
'Retorna timestamp atual no timezone America/Sao_Paulo';

-- Função para converter timestamp para timezone local
CREATE OR REPLACE FUNCTION to_local(ts timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
    SELECT ts AT TIME ZONE 'America/Sao_Paulo';
$$;

COMMENT ON FUNCTION to_local(timestamp with time zone) IS
'Converte timestamp para timezone America/Sao_Paulo';

-- Função para formatar data no formato brasileiro
CREATE OR REPLACE FUNCTION format_date_br(dt date)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT TO_CHAR(dt, 'DD/MM/YYYY');
$$;

COMMENT ON FUNCTION format_date_br(date) IS
'Formata data no formato brasileiro (DD/MM/YYYY)';

-- Função para formatar datetime no formato brasileiro
CREATE OR REPLACE FUNCTION format_datetime_br(ts timestamp with time zone)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT TO_CHAR(ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
$$;

COMMENT ON FUNCTION format_datetime_br(timestamp with time zone) IS
'Formata timestamp no formato brasileiro (DD/MM/YYYY HH24:MI:SS) no timezone America/Sao_Paulo';

-- ==============================================================================
-- TRIGGERS PARA GARANTIR TIMEZONE EM CREATED_AT/UPDATED_AT
-- ==============================================================================

-- Função trigger para garantir que timestamps usem timezone correto
CREATE OR REPLACE FUNCTION ensure_timezone_on_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Garantir que created_at use timezone correto
    IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
        NEW.created_at := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- Sempre atualizar updated_at com timezone correto
    IF TG_TABLE_NAME != 'clients' OR TG_OP != 'INSERT' THEN
        NEW.updated_at := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_timezone_on_timestamps() IS
'Trigger function para garantir que created_at e updated_at usem timezone America/Sao_Paulo';

-- ==============================================================================
-- VIEW PARA VERIFICAR TIMEZONE DAS TABELAS
-- ==============================================================================

-- View para verificar configuração de timezone em colunas
CREATE OR REPLACE VIEW v_timezone_info AS
SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    a.attname as column_name,
    t.typname as data_type,
    CASE
        WHEN t.typname LIKE '%timestamp%' THEN '✅ Usa timezone'
        WHEN t.typname = 'date' THEN '⚠️ Sem timezone (apenas data)'
        WHEN t.typname = 'time' THEN '⚠️ Sem timezone (apenas hora)'
        ELSE 'N/A'
    END as timezone_support
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_type t ON a.atttypid = t.oid
WHERE
    n.nspname = 'public'
    AND c.relkind = 'r'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND t.typname IN ('timestamp', 'timestamptz', 'date', 'time', 'timetz')
ORDER BY n.nspname, c.relname, a.attname;

COMMENT ON VIEW v_timezone_info IS
'View para verificar quais colunas de data/hora usam timezone';

-- ==============================================================================
-- DOCUMENTAÇÃO E VERIFICAÇÃO
-- ==============================================================================

-- Criar tabela de metadata para documentar configuração de timezone
CREATE TABLE IF NOT EXISTS _timezone_config (
    id serial PRIMARY KEY,
    timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
    description text,
    configured_at timestamp with time zone DEFAULT NOW(),
    configured_by text DEFAULT current_user
);

COMMENT ON TABLE _timezone_config IS
'Metadata sobre configuração de timezone do banco de dados';

-- Inserir configuração padrão
INSERT INTO _timezone_config (timezone, description)
VALUES (
    'America/Sao_Paulo',
    'Timezone padrão configurado para Horário de Brasília (UTC-3).
    Todas as operações de data/hora no banco usarão este timezone.
    Para queries, use: SET timezone = ''America/Sao_Paulo'';
    Para funções, use: now_local(), to_local(), format_datetime_br()'
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- QUERIES DE VERIFICAÇÃO (COMENTADAS)
-- ==============================================================================

-- Para verificar timezone atual:
-- SHOW timezone;

-- Para verificar todas as configurações de timezone:
-- SELECT name, setting, context FROM pg_settings WHERE name LIKE '%timezone%';

-- Para verificar colunas que usam timestamp:
-- SELECT * FROM v_timezone_info;

-- Para testar funções:
-- SELECT now_local();
-- SELECT to_local(NOW());
-- SELECT format_date_br(CURRENT_DATE);
-- SELECT format_datetime_br(NOW());

-- ==============================================================================
-- NOTAS IMPORTANTES
-- ==============================================================================

/*
NOTAS SOBRE TIMEZONE:

1. TIMESTAMP vs TIMESTAMP WITH TIME ZONE:
   - TIMESTAMP: Não armazena timezone (naive)
   - TIMESTAMPTZ: Armazena timezone (aware) - RECOMENDADO

2. CONFIGURAÇÃO DO BANCO:
   - ALTER DATABASE: Afeta todas as novas sessões
   - SET timezone: Afeta apenas a sessão atual
   - Aplicações devem configurar timezone na conexão

3. CONVERSÃO DE TIMEZONE:
   - AT TIME ZONE 'America/Sao_Paulo': Converte para timezone específico
   - NOW(): Retorna timestamp em UTC (se não configurado)
   - CURRENT_TIMESTAMP: Retorna timestamp no timezone da sessão

4. MELHORES PRÁTICAS:
   - Sempre usar TIMESTAMP WITH TIME ZONE para created_at/updated_at
   - Configurar timezone na conexão: SET timezone = 'America/Sao_Paulo'
   - Usar funções helper: now_local(), to_local()
   - Armazenar em UTC, converter para exibição

5. BACKEND INTEGRATION:
   - Python: Usar timezone_config.py
   - PostgreSQL: Esta migration configura timezone
   - Frontend: Usar timezone.config.ts

6. HORÁRIO DE VERÃO:
   - Brasil não usa mais horário de verão desde 2019
   - America/Sao_Paulo sempre UTC-3
*/

-- ==============================================================================
-- FIM DA MIGRATION
-- ==============================================================================

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00026_set_default_timezone.sql aplicada com sucesso';
    RAISE NOTICE '🌍 Timezone padrão: America/Sao_Paulo (UTC-3)';
    RAISE NOTICE '📝 Use: SELECT * FROM _timezone_config; para ver configuração';
    RAISE NOTICE '🔍 Use: SELECT * FROM v_timezone_info; para verificar colunas';
END;
$$;


-- ==============================================
-- = MIGRATION: 00027_fix_client_documents_storage_rls.sql
-- ==============================================
-- Migration: Fix client-documents bucket RLS policies
-- Description: Corrige políticas de Row-Level Security para permitir upload de documentos
-- Created: 2025-01-03

-- ============================================================================
-- CORREÇÃO DE RLS - BUCKET CLIENT-DOCUMENTS
-- ============================================================================

-- 1. Remover políticas antigas relacionadas a client-documents
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

-- Remover variações de nomes de políticas (de outras migrações)
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;

-- 2. Criar políticas permissivas para client-documents

-- Permitir INSERT (upload)
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload to client-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'client-documents'
);

-- Permitir SELECT (visualização)
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can view client-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'client-documents'
);

-- Permitir UPDATE (atualização de metadados)
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update client-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- Permitir DELETE (exclusão)
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete client-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'client-documents'
);

-- ============================================================================
-- VERIFICAR BUCKET client-documents EXISTE
-- ============================================================================

-- Verificar se bucket existe, caso contrário criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'client-documents'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'client-documents',
            'client-documents',
            false, -- Não público, requer autenticação
            10485760, -- 10MB limit
            ARRAY[
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        );

        RAISE NOTICE '✅ Bucket client-documents criado com sucesso';
    ELSE
        RAISE NOTICE '✅ Bucket client-documents já existe';
    END IF;
END;
$$;

-- ============================================================================
-- ATUALIZAR CONFIGURAÇÕES DO BUCKET (SE JÁ EXISTE)
-- ============================================================================

-- Garantir que bucket não seja público e tenha limite de tamanho adequado
UPDATE storage.buckets
SET
    public = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
WHERE id = 'client-documents';

-- ============================================================================
-- CRIAR VIEW PARA VERIFICAR UPLOADS
-- ============================================================================

CREATE OR REPLACE VIEW v_client_document_uploads AS
SELECT
    o.id,
    o.name,
    o.bucket_id,
    o.owner,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.metadata,
    CASE
        WHEN o.metadata->>'mimetype' LIKE 'image/%' THEN '🖼️ Imagem'
        WHEN o.metadata->>'mimetype' = 'application/pdf' THEN '📄 PDF'
        WHEN o.metadata->>'mimetype' LIKE 'application/vnd.ms-excel%'
          OR o.metadata->>'mimetype' LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' THEN '📊 Excel'
        WHEN o.metadata->>'mimetype' LIKE 'application/msword%'
          OR o.metadata->>'mimetype' LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml%' THEN '📝 Word'
        ELSE '📎 Arquivo'
    END as tipo_arquivo,
    ROUND((o.metadata->>'size')::numeric / 1024.0, 2) as tamanho_kb
FROM storage.objects o
WHERE o.bucket_id = 'client-documents'
ORDER BY o.created_at DESC;

COMMENT ON VIEW v_client_document_uploads IS
'View para monitorar uploads no bucket client-documents';

-- ============================================================================
-- FUNÇÃO PARA LIMPAR ARQUIVOS ÓRFÃOS (OPCIONAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_client_documents(days_old integer DEFAULT 30)
RETURNS TABLE (
    deleted_count integer,
    total_size_mb numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_size numeric := 0;
BEGIN
    -- CUIDADO: Esta função deve ser usada com cautela
    -- Remove arquivos do bucket que não têm referência em nenhuma tabela

    -- Por enquanto, apenas retorna estatísticas sem deletar
    SELECT
        COUNT(*),
        ROUND(SUM((metadata->>'size')::numeric) / 1024.0 / 1024.0, 2)
    INTO v_count, v_size
    FROM storage.objects
    WHERE
        bucket_id = 'client-documents'
        AND created_at < NOW() - (days_old || ' days')::interval
        -- Adicionar mais condições para verificar se arquivo está órfão
    ;

    RETURN QUERY SELECT v_count, COALESCE(v_size, 0);
END;
$$;

COMMENT ON FUNCTION cleanup_orphaned_client_documents(integer) IS
'Função para identificar e limpar arquivos órfãos no bucket client-documents (usar com cuidado)';

-- ============================================================================
-- VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar políticas criadas
DO $$
DECLARE
    v_policy_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%client-documents%';

    RAISE NOTICE '✅ Total de políticas RLS para client-documents: %', v_policy_count;
END;
$$;

-- Listar todas as políticas
SELECT
    policyname,
    cmd as operacao,
    permissive as permissiva,
    roles as para_roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%client-documents%'
ORDER BY cmd, policyname;

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

/*
RESUMO DAS POLÍTICAS RLS:

1. INSERT (Upload):
   - Qualquer usuário autenticado pode fazer upload
   - Não há restrição por user_id (permite multi-tenant)

2. SELECT (Visualização):
   - Qualquer usuário autenticado pode visualizar
   - Recomendação: Adicionar filtro por user_id se necessário privacidade

3. UPDATE (Atualização):
   - Qualquer usuário autenticado pode atualizar metadados
   - Arquivos do bucket são acessíveis por todos os usuários

4. DELETE (Exclusão):
   - Qualquer usuário autenticado pode deletar
   - Considerar adicionar restrição por owner se necessário

ATENÇÃO:
- Bucket configurado como NÃO PÚBLICO (public = false)
- Requer autenticação para acesso
- Limite de 10MB por arquivo
- Tipos de arquivo permitidos: imagens, PDF, Word, Excel

PARA RESTRINGIR POR USUÁRIO:
Se precisar que cada usuário veja apenas seus arquivos, adicionar:

WITH CHECK (auth.uid()::text = (storage.foldername(name))[1])
USING (auth.uid()::text = (storage.foldername(name))[1])

E organizar arquivos em pastas: client-documents/{user_id}/{filename}
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00027_fix_client_documents_storage_rls.sql aplicada com sucesso';
    RAISE NOTICE '🗂️ Bucket: client-documents configurado';
    RAISE NOTICE '🔒 RLS: Políticas permissivas para authenticated users';
    RAISE NOTICE '📊 View: v_client_document_uploads disponível';
    RAISE NOTICE '🧹 Função: cleanup_orphaned_client_documents() disponível';
END;
$$;


-- ==============================================
-- = MIGRATION: 00029_add_all_missing_contract_fields.sql
-- ==============================================
-- Add ALL missing fields to contracts table
-- This migration adds all fields that are used in ContractDataEdit.tsx but missing in the schema
-- Created: 2025-10-03

-- Client snapshot fields (for historical record)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_legal_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_cnpj VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_city VARCHAR(100);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_state VARCHAR(2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_zip_code VARCHAR(10);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contact_person VARCHAR(255);

-- Contract type and additional fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100);

-- Additional equipment fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_power VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_voltage VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_year TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS equipment_condition TEXT;

-- Maintenance and service fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS maintenance_frequency VARCHAR(50);

-- Additional contract terms and conditions
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS technical_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_conditions TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Add comments for documentation
COMMENT ON COLUMN contracts.client_name IS 'Client name snapshot at time of contract';
COMMENT ON COLUMN contracts.client_legal_name IS 'Client legal/company name snapshot';
COMMENT ON COLUMN contracts.client_cnpj IS 'Client CNPJ snapshot';
COMMENT ON COLUMN contracts.client_email IS 'Client email snapshot';
COMMENT ON COLUMN contracts.client_phone IS 'Client phone snapshot';
COMMENT ON COLUMN contracts.client_address IS 'Client address snapshot';
COMMENT ON COLUMN contracts.client_city IS 'Client city snapshot';
COMMENT ON COLUMN contracts.client_state IS 'Client state snapshot';
COMMENT ON COLUMN contracts.client_zip_code IS 'Client ZIP code snapshot';
COMMENT ON COLUMN contracts.client_contact_person IS 'Client contact person snapshot';
COMMENT ON COLUMN contracts.contract_type IS 'Type of contract (maintenance, rental, purchase, etc)';
COMMENT ON COLUMN contracts.equipment_power IS 'Equipment power rating (e.g., 150 kVA, 120 kW)';
COMMENT ON COLUMN contracts.equipment_voltage IS 'Equipment voltage (e.g., 220V, 380V, 440V)';
COMMENT ON COLUMN contracts.equipment_year IS 'Year of equipment manufacture';
COMMENT ON COLUMN contracts.equipment_condition IS 'Equipment condition (new, used, refurbished, etc)';
COMMENT ON COLUMN contracts.maintenance_frequency IS 'Frequency of maintenance (monthly, quarterly, etc)';
COMMENT ON COLUMN contracts.technical_notes IS 'Technical notes and specifications';
COMMENT ON COLUMN contracts.special_conditions IS 'Special contract conditions and clauses';
COMMENT ON COLUMN contracts.warranty_terms IS 'Warranty terms and conditions';


-- ==============================================
-- = MIGRATION: 00030_add_data_charts_to_generated_reports.sql
-- ==============================================
-- Add missing columns to generated_reports table
-- These columns are used by the Reports page to store additional report information

-- Add data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'data'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added data column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column data already exists in generated_reports';
    END IF;
END $$;

-- Add charts column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'charts'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN charts JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added charts column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column charts already exists in generated_reports';
    END IF;
END $$;

-- Add period_start column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'period_start'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN period_start DATE;
        RAISE NOTICE '✅ Added period_start column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column period_start already exists in generated_reports';
    END IF;
END $$;

-- Add period_end column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'generated_reports'
        AND column_name = 'period_end'
    ) THEN
        ALTER TABLE generated_reports ADD COLUMN period_end DATE;
        RAISE NOTICE '✅ Added period_end column to generated_reports';
    ELSE
        RAISE NOTICE '⚠️ Column period_end already exists in generated_reports';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_reports_data ON generated_reports USING gin(data);
CREATE INDEX IF NOT EXISTS idx_generated_reports_charts ON generated_reports USING gin(charts);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period_start ON generated_reports(period_start);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period_end ON generated_reports(period_end);


-- ==============================================
-- = MIGRATION: 00031_fix_status_tables_colors.sql
-- ==============================================
-- Migration: Fix Status Tables - Add Colors and Complete Data
-- Description: Adiciona colunas de cor e ícones às tabelas de status e popula dados corretos
-- Date: 2025-10-09

-- ==============================================
-- MAINTENANCE_STATUS: Adicionar colunas faltantes
-- ==============================================

ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE maintenance_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Limpar dados antigos de maintenance_status
TRUNCATE TABLE maintenance_status CASCADE;

-- Inserir status de manutenção com cores e ícones
INSERT INTO maintenance_status (name, description, color, icon, order_index, is_active)
VALUES
    ('Pendente', 'Manutenção pendente', '#9ca3af', 'clock', 1, true),
    ('Agendada', 'Manutenção agendada', '#3b82f6', 'calendar', 2, true),
    ('Em Andamento', 'Manutenção em andamento', '#f59e0b', 'play-circle', 3, true),
    ('Concluída', 'Manutenção concluída', '#10b981', 'check-circle', 4, true),
    ('Cancelada', 'Manutenção cancelada', '#6b7280', 'x-circle', 5, true),
    ('Atrasada', 'Manutenção atrasada', '#ef4444', 'alert-circle', 6, true);

-- ==============================================
-- CLIENT_STATUS: Atualizar dados com cores
-- ==============================================

-- Limpar e reinserir com cores corretas
TRUNCATE TABLE client_status CASCADE;

INSERT INTO client_status (name, color, description, is_active)
VALUES
    ('Ativo', '#10b981', 'Cliente ativo', true),
    ('Inativo', '#ef4444', 'Cliente inativo', true),
    ('Prospecto', '#f59e0b', 'Cliente em prospecção', true),
    ('Suspenso', '#6b7280', 'Cliente suspenso', true),
    ('Inadimplente', '#dc2626', 'Cliente inadimplente', true);

-- ==============================================
-- CRIAR ÍNDICES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_maintenance_status_order ON maintenance_status(order_index);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_is_active ON maintenance_status(is_active);
CREATE INDEX IF NOT EXISTS idx_client_status_is_active ON client_status(is_active);

-- ==============================================
-- TRIGGER PARA UPDATED_AT
-- ==============================================

DROP TRIGGER IF EXISTS update_maintenance_status_updated_at ON maintenance_status;
CREATE TRIGGER update_maintenance_status_updated_at
    BEFORE UPDATE ON maintenance_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON COLUMN maintenance_status.color IS 'Cor hexadecimal para UI (#RRGGBB)';
COMMENT ON COLUMN maintenance_status.icon IS 'Nome do ícone (lucide-react)';
COMMENT ON COLUMN maintenance_status.order_index IS 'Ordem de exibição';
COMMENT ON COLUMN client_status.color IS 'Cor hexadecimal para UI (#RRGGBB)';


-- ==============================================
-- = MIGRATION: 00032_add_equipment_year_condition.sql
-- ==============================================
-- Migration: Add year and condition columns to equipment table
-- Description: Adiciona colunas year e condition na tabela equipment para armazenar informações de equipamentos
-- Date: 2025-10-10
-- Relates to: Fix for equipment fields not being saved properly

-- Add year column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS year VARCHAR(50);

-- Add condition column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS condition VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN equipment.year IS 'Year of equipment manufacture';
COMMENT ON COLUMN equipment.condition IS 'Equipment condition (new, used, refurbished, etc)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_year ON equipment(year);
CREATE INDEX IF NOT EXISTS idx_equipment_condition ON equipment(condition);


-- ==============================================
-- = MIGRATION: 00033_normalize_equipment_data.sql
-- ==============================================
-- Migration: Normalize Equipment Data
-- Description: Migra dados de equipment_* da tabela contracts para a tabela equipment dedicada
-- Date: 2025-10-10
-- Relates to: Fix for equipment data inconsistency between contracts and equipment tables

-- ==============================================
-- PARTE 0: GARANTIR QUE COLUNAS EXISTEM
-- ==============================================

-- Adicionar colunas power e voltage se não existirem (necessário para migração de dados)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power VARCHAR(100);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS voltage VARCHAR(100);

COMMENT ON COLUMN equipment.power IS 'Equipment power specification (e.g., 450kVA)';
COMMENT ON COLUMN equipment.voltage IS 'Equipment voltage specification (e.g., 220V, 380V)';

-- ==============================================
-- PARTE 1: MIGRAR DADOS EXISTENTES
-- ==============================================

-- Criar registros na tabela equipment para contratos que têm dados equipment_*
-- mas não têm registro correspondente na tabela equipment
INSERT INTO equipment (
  user_id,
  contract_id,
  type,
  model,
  serial_number,
  location,
  manufacturer,
  year,
  condition,
  power,
  voltage,
  observations,
  quantity,
  installation_date,
  created_at,
  updated_at
)
SELECT
  c.user_id,
  c.id as contract_id,
  COALESCE(c.equipment_type, 'Gerador') as type,
  c.equipment_model as model,
  c.equipment_serial as serial_number,
  c.equipment_location as location,
  c.equipment_brand as manufacturer,
  c.equipment_year as year,
  c.equipment_condition as condition,
  c.equipment_power as power,
  c.equipment_voltage as voltage,
  NULL as observations,
  COALESCE(c.equipment_quantity, 1) as quantity,
  NULL as installation_date,
  NOW() as created_at,
  NOW() as updated_at
FROM contracts c
WHERE
  -- Tem pelo menos um campo de equipamento preenchido
  (c.equipment_type IS NOT NULL
   OR c.equipment_model IS NOT NULL
   OR c.equipment_serial IS NOT NULL
   OR c.equipment_location IS NOT NULL)
  -- E não existe registro correspondente na tabela equipment
  AND NOT EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.contract_id = c.id
  );

-- ==============================================
-- PARTE 2: ADICIONAR COMENTÁRIOS DE DEPRECAÇÃO
-- ==============================================

-- Marcar campos equipment_* como deprecated (mantidos por compatibilidade)
COMMENT ON COLUMN contracts.equipment_type IS '[DEPRECATED] Use tabela equipment - Tipo de equipamento';
COMMENT ON COLUMN contracts.equipment_model IS '[DEPRECATED] Use tabela equipment - Modelo do equipamento';
COMMENT ON COLUMN contracts.equipment_serial IS '[DEPRECATED] Use tabela equipment - Número de série';
COMMENT ON COLUMN contracts.equipment_location IS '[DEPRECATED] Use tabela equipment - Localização';
COMMENT ON COLUMN contracts.equipment_brand IS '[DEPRECATED] Use tabela equipment - Marca/Fabricante';
COMMENT ON COLUMN contracts.equipment_power IS '[DEPRECATED] Use tabela equipment - Potência';
COMMENT ON COLUMN contracts.equipment_voltage IS '[DEPRECATED] Use tabela equipment - Tensão';
COMMENT ON COLUMN contracts.equipment_year IS '[DEPRECATED] Use tabela equipment - Ano de fabricação';
COMMENT ON COLUMN contracts.equipment_condition IS '[DEPRECATED] Use tabela equipment - Condição';
COMMENT ON COLUMN contracts.equipment_quantity IS '[DEPRECATED] Use tabela equipment - Quantidade';

-- ==============================================
-- PARTE 3: CRIAR VIEW PARA COMPATIBILIDADE
-- ==============================================

-- View que une dados de contracts com equipment para facilitar queries existentes
DROP VIEW IF EXISTS contract_with_equipment CASCADE;
CREATE VIEW contract_with_equipment AS
SELECT
  c.*,
  e.type as eq_type,
  e.model as eq_model,
  e.serial_number as eq_serial_number,
  e.location as eq_location,
  e.manufacturer as eq_manufacturer,
  e.year as eq_year,
  e.condition as eq_condition,
  e.power as eq_power,
  e.voltage as eq_voltage,
  e.quantity as eq_quantity,
  e.observations as eq_observations,
  e.installation_date as eq_installation_date
FROM contracts c
LEFT JOIN equipment e ON e.contract_id = c.id;

COMMENT ON VIEW contract_with_equipment IS 'View de compatibilidade que une contratos com equipamentos. Use para leitura apenas.';

-- ==============================================
-- PARTE 4: ÍNDICES E OTIMIZAÇÕES
-- ==============================================

-- Garantir que índices necessários existem
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id_active ON equipment(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_type_model ON equipment(type, model) WHERE type IS NOT NULL AND model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_year_condition ON equipment(year, condition) WHERE year IS NOT NULL;

-- ==============================================
-- PARTE 5: ESTATÍSTICAS E VALIDAÇÃO
-- ==============================================

-- Registrar estatísticas da migração
DO $$
DECLARE
  contracts_with_equipment_fields INTEGER;
  equipment_records INTEGER;
  migrated_records INTEGER;
BEGIN
  -- Contar contratos com campos equipment_*
  SELECT COUNT(*) INTO contracts_with_equipment_fields
  FROM contracts
  WHERE equipment_type IS NOT NULL
     OR equipment_model IS NOT NULL
     OR equipment_serial IS NOT NULL;

  -- Contar registros na tabela equipment
  SELECT COUNT(*) INTO equipment_records
  FROM equipment;

  -- Calcular quantos foram migrados (aproximado)
  migrated_records := equipment_records;

  RAISE NOTICE '=== ESTATÍSTICAS DA MIGRAÇÃO ===';
  RAISE NOTICE 'Contratos com dados equipment_*: %', contracts_with_equipment_fields;
  RAISE NOTICE 'Registros totais na tabela equipment: %', equipment_records;
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- ==============================================
-- PARTE 6: CONSTRAINTS E VALIDAÇÕES
-- ==============================================

-- Garantir que pelo menos type, model e location estejam preenchidos
-- para novos registros de equipment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'equipment_required_fields_check'
    ) THEN
        ALTER TABLE equipment
        ADD CONSTRAINT equipment_required_fields_check
        CHECK (
          (type IS NOT NULL AND type != '') OR
          (model IS NOT NULL AND model != '') OR
          (location IS NOT NULL AND location != '')
        );

        COMMENT ON CONSTRAINT equipment_required_fields_check ON equipment IS
        'Garante que pelo menos um dos campos principais (type, model, location) esteja preenchido';
    END IF;
END $$;


-- ==============================================
-- = MIGRATION: 00034_add_equipment_power_voltage.sql
-- ==============================================
-- Migration: Add power and voltage columns to equipment table
-- Description: Adiciona colunas power e voltage na tabela equipment para armazenar potência e tensão
-- Date: 2025-10-10
-- Relates to: Fix for equipment fields (Potência e Tensão) not being saved properly

-- Add power column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power VARCHAR(100);

-- Add voltage column
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS voltage VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN equipment.power IS 'Equipment power specification (e.g., 450kVA)';
COMMENT ON COLUMN equipment.voltage IS 'Equipment voltage specification (e.g., 220V, 380V)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_power ON equipment(power);
CREATE INDEX IF NOT EXISTS idx_equipment_voltage ON equipment(voltage);


-- ==============================================
-- = MIGRATION: 00035_fix_client_users_rls.sql
-- ==============================================
-- Migration: Fix client_users RLS policies
-- Description: Corrige políticas RLS da tabela client_users para permitir operações corretas
-- Date: 2025-10-10
-- Relates to: Fix for RLS error "new row violates row-level security policy for table client_users"

-- ==============================================
-- DROP EXISTING POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Users can view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Users can create their client relationships" ON client_users;
DROP POLICY IF EXISTS "Owners can delete client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to view their client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow authenticated users to create client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to update their client relationships" ON client_users;
DROP POLICY IF EXISTS "Allow users to delete their client relationships" ON client_users;

-- ==============================================
-- CREATE NEW PERMISSIVE POLICIES
-- ==============================================

-- Policy: SELECT - Usuários podem ver seus próprios relacionamentos
DROP POLICY IF EXISTS "client_users_select_policy" ON client_users;
CREATE POLICY "client_users_select_policy"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: INSERT - Permite inserção se:
-- 1. O user_id corresponde ao usuário autenticado OU
-- 2. Não há user_id (será preenchido por trigger/default)
DROP POLICY IF EXISTS "client_users_insert_policy" ON client_users;
CREATE POLICY "client_users_insert_policy"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NOT NULL  -- Qualquer usuário autenticado pode criar relacionamentos
);

-- Policy: UPDATE - Usuários podem atualizar seus próprios relacionamentos
DROP POLICY IF EXISTS "client_users_update_policy" ON client_users;
CREATE POLICY "client_users_update_policy"
ON client_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: DELETE - Apenas owners podem deletar relacionamentos
DROP POLICY IF EXISTS "client_users_delete_policy" ON client_users;
CREATE POLICY "client_users_delete_policy"
ON client_users FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND role = 'owner'
);

-- ==============================================
-- ADD SERVICE ROLE BYPASS POLICY
-- ==============================================

-- Permite que o service role (backend) faça qualquer operação
DROP POLICY IF EXISTS "client_users_service_role_policy" ON client_users;
CREATE POLICY "client_users_service_role_policy"
ON client_users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD HELPFUL COMMENTS
-- ==============================================

COMMENT ON POLICY "client_users_select_policy" ON client_users IS
    'Permite que usuários vejam seus próprios relacionamentos com clientes';

COMMENT ON POLICY "client_users_insert_policy" ON client_users IS
    'Permite inserção de relacionamentos para usuários autenticados';

COMMENT ON POLICY "client_users_update_policy" ON client_users IS
    'Permite que usuários atualizem seus próprios relacionamentos';

COMMENT ON POLICY "client_users_delete_policy" ON client_users IS
    'Permite que owners deletem relacionamentos';

COMMENT ON POLICY "client_users_service_role_policy" ON client_users IS
    'Permite que o backend (service role) execute qualquer operação';


-- ==============================================
-- = MIGRATION: 00036_add_generated_reports_metadata.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00037_fix_chat_sessions_rls.sql
-- ==============================================
-- Migration: Fix chat_sessions RLS policies
-- Description: Corrige políticas RLS da tabela chat_sessions para permitir operações corretas
-- Date: 2025-10-10
-- Relates to: Fix for RLS error "new row violates row-level security policy for table chat_sessions"

-- ==============================================
-- DROP EXISTING POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Users can manage their chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view their chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete their chat sessions" ON chat_sessions;

-- ==============================================
-- CREATE NEW PERMISSIVE POLICIES
-- ==============================================

-- Policy: SELECT - Usuários podem ver suas próprias sessões
DROP POLICY IF EXISTS "chat_sessions_select_policy" ON chat_sessions;
CREATE POLICY "chat_sessions_select_policy"
ON chat_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: INSERT - Permite inserção se o user_id corresponde ao usuário autenticado
DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON chat_sessions;
CREATE POLICY "chat_sessions_insert_policy"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR auth.uid() IS NOT NULL  -- Qualquer usuário autenticado pode criar sessões
);

-- Policy: UPDATE - Usuários podem atualizar suas próprias sessões
DROP POLICY IF EXISTS "chat_sessions_update_policy" ON chat_sessions;
CREATE POLICY "chat_sessions_update_policy"
ON chat_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: DELETE - Usuários podem deletar suas próprias sessões
DROP POLICY IF EXISTS "chat_sessions_delete_policy" ON chat_sessions;
CREATE POLICY "chat_sessions_delete_policy"
ON chat_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ==============================================
-- ADD SERVICE ROLE BYPASS POLICY
-- ==============================================

-- Permite que o service role (backend) faça qualquer operação
DROP POLICY IF EXISTS "chat_sessions_service_role_policy" ON chat_sessions;
CREATE POLICY "chat_sessions_service_role_policy"
ON chat_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD HELPFUL COMMENTS
-- ==============================================

COMMENT ON POLICY "chat_sessions_select_policy" ON chat_sessions IS
    'Permite que usuários vejam suas próprias sessões de chat';

COMMENT ON POLICY "chat_sessions_insert_policy" ON chat_sessions IS
    'Permite criação de sessões de chat para usuários autenticados';

COMMENT ON POLICY "chat_sessions_update_policy" ON chat_sessions IS
    'Permite que usuários atualizem suas próprias sessões';

COMMENT ON POLICY "chat_sessions_delete_policy" ON chat_sessions IS
    'Permite que usuários deletem suas próprias sessões';

COMMENT ON POLICY "chat_sessions_service_role_policy" ON chat_sessions IS
    'Permite que o backend (service role) execute qualquer operação';


-- ==============================================
-- = MIGRATION: 00038_add_missing_generated_reports_columns.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00039_fix_chat_sessions_rls_permissive.sql
-- ==============================================
-- Migration: Fix chat_sessions RLS to be truly permissive
-- Description: Torna a política RLS de chat_sessions mais permissiva para permitir inserções
-- Date: 2025-10-10
-- Relates to: Fix for persistent RLS error "new row violates row-level security policy for table chat_sessions"

-- ==============================================
-- DROP AND RECREATE INSERT POLICY
-- ==============================================

-- Remove a política INSERT antiga
DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON chat_sessions;

-- Cria nova política INSERT mais permissiva
-- Permite que qualquer usuário autenticado crie sessões de chat
CREATE POLICY "chat_sessions_insert_policy"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (
    -- Permite se o usuário está autenticado
    auth.uid() IS NOT NULL
);

-- ==============================================
-- ATUALIZAR POLÍTICA SELECT PARA SER MAIS PERMISSIVA
-- ==============================================

-- Remove política SELECT antiga
DROP POLICY IF EXISTS "chat_sessions_select_policy" ON chat_sessions;

-- Permite que usuários vejam suas próprias sessões OU sessões sem user_id definido
CREATE POLICY "chat_sessions_select_policy"
ON chat_sessions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IS NOT NULL  -- Permite ver todas as sessões se autenticado
);

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON POLICY "chat_sessions_insert_policy" ON chat_sessions IS
    'Permite que qualquer usuário autenticado crie sessões de chat';

COMMENT ON POLICY "chat_sessions_select_policy" ON chat_sessions IS
    'Permite que usuários autenticados vejam sessões de chat';


-- ==============================================
-- = MIGRATION: 00040_add_payment_terms_fix_services.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00041_fix_chat_sessions_rls_anon.sql
-- ==============================================
-- Migration: Add anon role policy for chat_sessions
-- Description: Adiciona política para role anon permitir inserções de chat_sessions
-- Date: 2025-10-10
-- Relates to: Fix persistent RLS error for chat_sessions

-- ==============================================
-- DROP EXISTING ANON POLICIES IF EXIST
-- ==============================================

DROP POLICY IF EXISTS "chat_sessions_anon_insert_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_select_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_update_policy" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_anon_delete_policy" ON chat_sessions;

-- ==============================================
-- ADD POLICIES FOR ANON ROLE
-- ==============================================

-- Política para role anon (usuários não autenticados usando API key)
CREATE POLICY "chat_sessions_anon_insert_policy"
ON chat_sessions FOR INSERT
TO anon
WITH CHECK (true);

-- Política SELECT para anon
CREATE POLICY "chat_sessions_anon_select_policy"
ON chat_sessions FOR SELECT
TO anon
USING (true);

-- Política UPDATE para anon
CREATE POLICY "chat_sessions_anon_update_policy"
ON chat_sessions FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Política DELETE para anon
CREATE POLICY "chat_sessions_anon_delete_policy"
ON chat_sessions FOR DELETE
TO anon
USING (true);

-- ==============================================
-- MAKE INSERT POLICY EVEN MORE PERMISSIVE
-- ==============================================

-- Remove a política INSERT atual
DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON chat_sessions;

-- Recria sem nenhuma verificação
CREATE POLICY "chat_sessions_insert_policy"
ON chat_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================
-- ADD COMMENTS
-- ==============================================

COMMENT ON POLICY "chat_sessions_anon_insert_policy" ON chat_sessions IS
    'Permite que o role anon crie sessões de chat (para API calls)';

COMMENT ON POLICY "chat_sessions_insert_policy" ON chat_sessions IS
    'Permite que usuários autenticados criem sessões sem restrições';


-- ==============================================
-- = MIGRATION: 00042_disable_chat_sessions_rls.sql
-- ==============================================
-- Migration: Temporarily disable RLS for chat_sessions
-- Description: Desabilita RLS temporariamente para chat_sessions para permitir operações
-- Date: 2025-10-10
-- Relates to: Fix persistent RLS error that won't resolve with policies

-- ==============================================
-- DISABLE RLS FOR chat_sessions
-- ==============================================

-- Desabilitar RLS completamente
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD COMMENT
-- ==============================================

COMMENT ON TABLE chat_sessions IS 'Chat sessions table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';

-- ==============================================
-- LOG WARNING
-- ==============================================

DO $$
BEGIN
    RAISE WARNING '⚠️  RLS DESABILITADO para chat_sessions. Esta é uma solução temporária!';
END $$;


-- ==============================================
-- = MIGRATION: 00043_disable_rls_problematic_tables.sql
-- ==============================================
-- Migration: Disable RLS for problematic tables
-- Description: Desabilita RLS temporariamente para tabelas com problemas persistentes
-- Date: 2025-10-10
-- Relates to: Fix persistent RLS errors across multiple tables

-- ==============================================
-- DISABLE RLS FOR PROBLEMATIC TABLES
-- ==============================================

-- Desabilitar RLS para client_users
ALTER TABLE client_users DISABLE ROW LEVEL SECURITY;

-- Confirmar que chat_sessions está com RLS desabilitado
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS para outras tabelas relacionadas que podem causar problemas
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- ADD COMMENTS
-- ==============================================

COMMENT ON TABLE client_users IS 'Client users table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';
COMMENT ON TABLE chat_sessions IS 'Chat sessions table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';
COMMENT ON TABLE contracts IS 'Contracts table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';
COMMENT ON TABLE equipment IS 'Equipment table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';
COMMENT ON TABLE generated_reports IS 'Generated reports table - RLS DISABLED temporariamente para permitir operações. TODO: Reabilitar com políticas corretas';

-- ==============================================
-- LOG WARNING
-- ==============================================

DO $$
BEGIN
    RAISE WARNING '⚠️  RLS DESABILITADO para múltiplas tabelas. Esta é uma solução temporária!';
    RAISE WARNING '📋 Tabelas afetadas: client_users, chat_sessions, contracts, equipment, generated_reports';
    RAISE WARNING '🔒 TODO: Implementar políticas RLS corretas e reabilitar segurança';
END $$;


-- ==============================================
-- = MIGRATION: 00044_add_contract_documents_missing_columns.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00045_add_maintenance_checklist_is_required.sql
-- ==============================================
-- Migration: Add is_required column to maintenance_checklist
-- Description: Adds the is_required column to support required checklist items
-- Date: 2025-10-22

ALTER TABLE maintenance_checklist 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Update existing records to have a default value
UPDATE maintenance_checklist 
SET is_required = false 
WHERE is_required IS NULL;


-- ==============================================
-- = MIGRATION: 00046_create_maintenance_checklist_templates.sql
-- ==============================================
-- Create maintenance_checklist_templates table
CREATE TABLE IF NOT EXISTS maintenance_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    maintenance_type VARCHAR(100),
    items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_user_id
ON maintenance_checklist_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_is_active
ON maintenance_checklist_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_templates_maintenance_type
ON maintenance_checklist_templates(maintenance_type);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenance_checklist_templates_updated_at ON maintenance_checklist_templates;

CREATE TRIGGER update_maintenance_checklist_templates_updated_at
    BEFORE UPDATE ON maintenance_checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE maintenance_checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_checklist_templates_insert_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_insert_policy ON maintenance_checklist_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS maintenance_checklist_templates_select_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_select_policy ON maintenance_checklist_templates
    FOR SELECT
    USING (auth.uid() = user_id OR is_active = true);

DROP POLICY IF EXISTS maintenance_checklist_templates_update_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_update_policy ON maintenance_checklist_templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS maintenance_checklist_templates_delete_policy ON maintenance_checklist_templates;
CREATE POLICY maintenance_checklist_templates_delete_policy ON maintenance_checklist_templates
    FOR DELETE
    USING (auth.uid() = user_id);


-- ==============================================
-- = MIGRATION: 00047_add_required_field_constraints.sql
-- ==============================================
-- Add NOT NULL constraints to required fields in contracts table
ALTER TABLE contracts
  ALTER COLUMN contract_number SET NOT NULL,
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add NOT NULL constraints to required fields in maintenances table
ALTER TABLE maintenances
  ALTER COLUMN contract_id SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN scheduled_date SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add NOT NULL constraints to required fields in maintenance_checklist
ALTER TABLE maintenance_checklist
  ALTER COLUMN maintenance_id SET NOT NULL;

-- Create function to validate contract before insertion/update
CREATE OR REPLACE FUNCTION validate_contract_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    RAISE EXCEPTION 'contract_number é obrigatório';
  END IF;

  IF NEW.client_name IS NULL OR NEW.client_name = '' THEN
    RAISE EXCEPTION 'client_name é obrigatório';
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    RAISE EXCEPTION 'status é obrigatório';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract validation
DROP TRIGGER IF EXISTS check_contract_required_fields ON contracts;
CREATE TRIGGER check_contract_required_fields
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION validate_contract_required_fields();

-- Create function to validate maintenance before insertion/update
CREATE OR REPLACE FUNCTION validate_maintenance_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_id IS NULL THEN
    RAISE EXCEPTION 'contract_id é obrigatório';
  END IF;

  IF NEW.type IS NULL OR NEW.type = '' THEN
    RAISE EXCEPTION 'type (tipo de manutenção) é obrigatório';
  END IF;

  IF NEW.scheduled_date IS NULL THEN
    RAISE EXCEPTION 'scheduled_date é obrigatório';
  END IF;

  IF NEW.status IS NULL OR NEW.status = '' THEN
    RAISE EXCEPTION 'status é obrigatório';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintenance validation
DROP TRIGGER IF EXISTS check_maintenance_required_fields ON maintenances;
CREATE TRIGGER check_maintenance_required_fields
  BEFORE INSERT OR UPDATE ON maintenances
  FOR EACH ROW
  EXECUTE FUNCTION validate_maintenance_required_fields();


-- ==============================================
-- = MIGRATION: 00048_fix_maintenance_checklist_schema.sql
-- ==============================================
-- Migration: Fix maintenance_checklist schema
-- Description: Ensures maintenance_checklist table exists with correct structure
-- Date: 2025-01-27

-- Create maintenance_checklist table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_maintenance_id 
ON maintenance_checklist(maintenance_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_is_completed 
ON maintenance_checklist(is_completed);

-- Enable RLS
ALTER TABLE maintenance_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can view maintenance checklist" 
ON maintenance_checklist FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can insert maintenance checklist" 
ON maintenance_checklist FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can update maintenance checklist" 
ON maintenance_checklist FOR UPDATE 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete maintenance checklist" ON maintenance_checklist;
CREATE POLICY "Users can delete maintenance checklist" 
ON maintenance_checklist FOR DELETE 
USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_maintenance_checklist_updated_at ON maintenance_checklist;
CREATE TRIGGER update_maintenance_checklist_updated_at
    BEFORE UPDATE ON maintenance_checklist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==============================================
-- = MIGRATION: 00049_create_maintenance_checklist_meta.sql
-- ==============================================
-- Migration: Create maintenance_checklist_meta
-- Description: Stores progress and required counters per maintenance_id
-- Date: 2025-10-28

CREATE TABLE IF NOT EXISTS maintenance_checklist_meta (
  maintenance_id UUID PRIMARY KEY REFERENCES maintenances(id) ON DELETE CASCADE,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  required_total INTEGER NOT NULL DEFAULT 0,
  required_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups (redundant with PK but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_meta_maintenance_id
ON maintenance_checklist_meta (maintenance_id);

-- Enable RLS
ALTER TABLE maintenance_checklist_meta ENABLE ROW LEVEL SECURITY;

-- Permissive policies (align with existing maintenance_checklist policies)
DROP POLICY IF EXISTS "Users can view maintenance checklist meta" ON maintenance_checklist_meta;
CREATE POLICY "Users can view maintenance checklist meta"
ON maintenance_checklist_meta FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can upsert maintenance checklist meta" ON maintenance_checklist_meta;
CREATE POLICY "Users can upsert maintenance checklist meta"
ON maintenance_checklist_meta FOR ALL
USING (true) WITH CHECK (true);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_maintenance_checklist_meta_updated_at ON maintenance_checklist_meta;
CREATE TRIGGER update_maintenance_checklist_meta_updated_at
  BEFORE UPDATE ON maintenance_checklist_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notice
DO $$ BEGIN
  RAISE NOTICE '✅ Migration 00049_create_maintenance_checklist_meta.sql applied';
END $$;




-- ==============================================
-- = MIGRATION: 00050_add_neighborhood_number_fields.sql
-- ==============================================
-- Migration: Add neighborhood and number fields to address
-- Description: Adiciona campos de bairro e número separados para endereços
-- Date: 2025-01-27
-- Purpose: Separar endereço em campos mais específicos (bairro, número)

-- ==============================================
-- CLIENTS TABLE - Add neighborhood and number fields
-- ==============================================

-- Adicionar campo de bairro
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

-- Adicionar campo de número
ALTER TABLE clients ADD COLUMN IF NOT EXISTS number VARCHAR(20);

-- ==============================================
-- CONTRACTS TABLE - Add neighborhood and number fields
-- ==============================================

-- Adicionar campo de bairro do cliente
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_neighborhood VARCHAR(100);

-- Adicionar campo de número do cliente
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_number VARCHAR(20);

-- ==============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON COLUMN clients.neighborhood IS 'Bairro do cliente';
COMMENT ON COLUMN clients.number IS 'Número do endereço do cliente';

COMMENT ON COLUMN contracts.client_neighborhood IS 'Bairro do cliente (snapshot no momento do contrato)';
COMMENT ON COLUMN contracts.client_number IS 'Número do endereço do cliente (snapshot no momento do contrato)';

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_clients_neighborhood ON clients(neighborhood);
CREATE INDEX IF NOT EXISTS idx_contracts_client_neighborhood ON contracts(client_neighborhood);


-- ==============================================
-- = MIGRATION: 00051_maintenance_status_rules.sql
-- ==============================================
-- Migration: Maintenance Status Automatic Rules
-- Description: Implementa regras automáticas de mudança de status de manutenções
-- Date: 2025-10-30

-- ==============================================
-- ATUALIZAR STATUS EXISTENTES
-- ==============================================

-- Limpar e reinserir status com nova estrutura
TRUNCATE TABLE maintenance_status CASCADE;

INSERT INTO maintenance_status (name, description, color, icon, order_index, is_active)
VALUES
    ('pending', 'Manutenção sem data definida', '#9ca3af', 'clock', 1, true),
    ('scheduled', 'Manutenção agendada aguardando confirmação', '#3b82f6', 'calendar', 2, true),
    ('confirmed', 'Manutenção confirmada pelo cliente', '#22c55e', 'calendar-check', 3, true),
    ('in_progress', 'Manutenção em andamento', '#f59e0b', 'play-circle', 4, true),
    ('completed', 'Manutenção concluída', '#10b981', 'check-circle', 5, true),
    ('cancelled', 'Manutenção cancelada', '#ef4444', 'x-circle', 6, true),
    ('overdue', 'Manutenção atrasada', '#dc2626', 'alert-circle', 7, true);

-- ==============================================
-- ADICIONAR COLUNAS NECESSÁRIAS
-- ==============================================

ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS confirmation_method VARCHAR(50);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMP WITH TIME ZONE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

-- ==============================================
-- FUNÇÃO: AUTO TRANSITION PENDING TO SCHEDULED
-- Quando uma data é atribuída, muda de pending para scheduled
-- ==============================================

CREATE OR REPLACE FUNCTION auto_transition_pending_to_scheduled()
RETURNS TRIGGER AS $$
BEGIN
    -- Se scheduled_date foi definido e status é pending
    IF NEW.scheduled_date IS NOT NULL AND
       OLD.scheduled_date IS NULL AND
       NEW.status = 'pending' THEN
        NEW.status = 'scheduled';
        NEW.updated_at = NOW();

        RAISE NOTICE 'Manutenção % mudou de pending para scheduled automaticamente', NEW.id;
    END IF;

    -- Se scheduled_date foi definido mas status ainda é pending (update de data)
    IF NEW.scheduled_date IS NOT NULL AND
       NEW.status = 'pending' THEN
        NEW.status = 'scheduled';
        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: AUTO TRANSITION CONFIRMED TO IN_PROGRESS
-- No dia/hora da manutenção, muda de confirmed para in_progress
-- ==============================================

CREATE OR REPLACE FUNCTION auto_transition_confirmed_to_in_progress()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Buscar manutenções confirmadas que já deveriam ter iniciado
    FOR rec IN
        SELECT id, contract_id, scheduled_date
        FROM maintenances
        WHERE status = 'confirmed'
        AND scheduled_date <= NOW()
        AND scheduled_date >= NOW() - INTERVAL '24 hours' -- Apenas das últimas 24h
    LOOP
        UPDATE maintenances
        SET status = 'in_progress',
            updated_at = NOW()
        WHERE id = rec.id;

        RAISE NOTICE 'Manutenção % iniciada automaticamente', rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: CHECK OVERDUE MAINTENANCES
-- Marca manutenções como atrasadas
-- ==============================================

CREATE OR REPLACE FUNCTION check_overdue_maintenances()
RETURNS void AS $$
BEGIN
    -- Marcar como overdue manutenções scheduled não confirmadas após a data
    UPDATE maintenances
    SET status = 'overdue',
        updated_at = NOW()
    WHERE status IN ('scheduled', 'confirmed')
    AND scheduled_date < NOW() - INTERVAL '1 day';

    -- Log quantidade atualizada
    IF FOUND THEN
        RAISE NOTICE 'Manutenções marcadas como atrasadas: %', FOUND;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: CONFIRM MAINTENANCE
-- Confirma uma manutenção manualmente ou via notificação
-- ==============================================

CREATE OR REPLACE FUNCTION confirm_maintenance(
    p_maintenance_id UUID,
    p_confirmation_method VARCHAR DEFAULT 'manual'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status VARCHAR;
BEGIN
    -- Verificar status atual
    SELECT status INTO v_current_status
    FROM maintenances
    WHERE id = p_maintenance_id;

    -- Só pode confirmar se estiver scheduled
    IF v_current_status = 'scheduled' THEN
        UPDATE maintenances
        SET status = 'confirmed',
            confirmed_at = NOW(),
            confirmation_method = p_confirmation_method,
            updated_at = NOW()
        WHERE id = p_maintenance_id;

        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Manutenção % não pode ser confirmada. Status atual: %', p_maintenance_id, v_current_status;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: SEND MAINTENANCE NOTIFICATIONS
-- Envia notificações baseadas em regras
-- ==============================================

CREATE OR REPLACE FUNCTION check_and_queue_notifications()
RETURNS TABLE (
    maintenance_id UUID,
    notification_type VARCHAR,
    days_until INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- Notificação de 3 dias antes
    SELECT
        m.id,
        '3_days_before'::VARCHAR,
        3::INTEGER
    FROM maintenances m
    WHERE m.status = 'scheduled'
    AND m.scheduled_date = CURRENT_DATE + INTERVAL '3 days'
    AND (m.last_notification_sent IS NULL OR
         m.last_notification_sent < CURRENT_DATE)

    UNION ALL

    -- Notificação de 1 dia antes
    SELECT
        m.id,
        '1_day_before'::VARCHAR,
        1::INTEGER
    FROM maintenances m
    WHERE m.status IN ('scheduled', 'confirmed')
    AND m.scheduled_date = CURRENT_DATE + INTERVAL '1 day'
    AND (m.last_notification_sent IS NULL OR
         m.last_notification_sent < CURRENT_DATE)

    UNION ALL

    -- Notificação do dia
    SELECT
        m.id,
        'same_day'::VARCHAR,
        0::INTEGER
    FROM maintenances m
    WHERE m.status IN ('scheduled', 'confirmed')
    AND m.scheduled_date::DATE = CURRENT_DATE
    AND (m.last_notification_sent IS NULL OR
         m.last_notification_sent < CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: MARK NOTIFICATION AS SENT
-- ==============================================

CREATE OR REPLACE FUNCTION mark_notification_sent(p_maintenance_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE maintenances
    SET last_notification_sent = NOW(),
        notification_count = notification_count + 1
    WHERE id = p_maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGER: AUTO TRANSITION ON UPDATE
-- ==============================================

DROP TRIGGER IF EXISTS trigger_auto_transition_maintenance_status ON maintenances;
CREATE TRIGGER trigger_auto_transition_maintenance_status
    BEFORE UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION auto_transition_pending_to_scheduled();

-- ==============================================
-- FUNÇÃO DE AGENDAMENTO: EXECUTA A CADA HORA
-- Para ser executada por um cron job ou edge function
-- ==============================================

CREATE OR REPLACE FUNCTION run_maintenance_status_checks()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_updated_count INTEGER := 0;
    v_notifications jsonb := '[]'::jsonb;
    v_notification RECORD;
BEGIN
    -- Executar transição de confirmed para in_progress
    PERFORM auto_transition_confirmed_to_in_progress();
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Verificar manutenções atrasadas
    PERFORM check_overdue_maintenances();

    -- Buscar notificações pendentes
    FOR v_notification IN SELECT * FROM check_and_queue_notifications() LOOP
        v_notifications = v_notifications || jsonb_build_object(
            'maintenance_id', v_notification.maintenance_id,
            'type', v_notification.notification_type,
            'days_until', v_notification.days_until
        );
    END LOOP;

    -- Retornar resultado
    v_result = jsonb_build_object(
        'timestamp', NOW(),
        'transitions_made', v_updated_count,
        'pending_notifications', v_notifications
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON maintenances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_confirmed_at ON maintenances(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_maintenances_notifications ON maintenances(last_notification_sent, notification_count);

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON COLUMN maintenances.confirmed_at IS 'Data/hora da confirmação pelo cliente';
COMMENT ON COLUMN maintenances.confirmation_method IS 'Método de confirmação (manual, email, whatsapp, etc)';
COMMENT ON COLUMN maintenances.last_notification_sent IS 'Última vez que uma notificação foi enviada';
COMMENT ON COLUMN maintenances.notification_count IS 'Quantidade de notificações enviadas';

COMMENT ON FUNCTION auto_transition_pending_to_scheduled() IS 'Muda automaticamente de pending para scheduled quando data é definida';
COMMENT ON FUNCTION auto_transition_confirmed_to_in_progress() IS 'Muda automaticamente de confirmed para in_progress no dia da manutenção';
COMMENT ON FUNCTION check_overdue_maintenances() IS 'Marca manutenções como atrasadas';
COMMENT ON FUNCTION confirm_maintenance(UUID, VARCHAR) IS 'Confirma uma manutenção agendada';
COMMENT ON FUNCTION check_and_queue_notifications() IS 'Verifica e retorna notificações pendentes';
COMMENT ON FUNCTION run_maintenance_status_checks() IS 'Executa todas as verificações de status - para ser chamada periodicamente';

-- ==============================================
-- EXEMPLO DE USO
-- ==============================================

-- Para confirmar uma manutenção:
-- SELECT confirm_maintenance('maintenance-uuid-here', 'whatsapp');

-- Para executar verificações periódicas (via cron/edge function):
-- SELECT run_maintenance_status_checks();

-- ==============================================
-- = MIGRATION: 00052_enable_pgcrypto_extension.sql
-- ==============================================
-- Enable pgcrypto extension for password hashing functions
-- This is required for crypt() and gen_salt() functions

-- Create the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify that the extension is installed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'pgcrypto extension failed to install';
    END IF;
END $$;

-- Test that the functions are available
DO $$
DECLARE
    test_hash text;
BEGIN
    -- Test gen_salt function
    test_hash := gen_salt('bf');

    -- Test crypt function
    test_hash := crypt('test', gen_salt('bf'));

    RAISE NOTICE 'pgcrypto extension installed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'pgcrypto functions not working properly: %', SQLERRM;
END $$;

-- ==============================================
-- = MIGRATION: 00053_fix_contract_documents_storage_rls.sql
-- ==============================================
-- Migration: Fix contract-documents bucket RLS policies
-- Description: Corrige políticas de Row-Level Security para permitir upload de documentos
-- Created: 2025-01-04

-- ============================================================================
-- CORREÇÃO DE RLS - BUCKET CONTRACT-DOCUMENTS
-- ============================================================================

-- 1. Remover políticas antigas relacionadas a contract-documents
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

-- Remover variações de nomes de políticas (de outras migrações)
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;

-- 2. Criar políticas permissivas para contract-documents

-- Permitir INSERT (upload)
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload to contract-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'contract-documents'
);

-- Permitir SELECT (visualização)
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can view contract-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'contract-documents'
);

-- Permitir UPDATE (atualização de metadados)
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update contract-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');

-- Permitir DELETE (exclusão)
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete contract-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'contract-documents'
);

-- ============================================================================
-- VERIFICAR BUCKET contract-documents EXISTE
-- ============================================================================

-- Verificar se bucket existe, caso contrário criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'contract-documents'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'contract-documents',
            'contract-documents',
            false, -- Não público, requer autenticação
            52428800, -- 50MB limit
            ARRAY[
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        );

        RAISE NOTICE '✅ Bucket contract-documents criado com sucesso';
    ELSE
        RAISE NOTICE '✅ Bucket contract-documents já existe';
    END IF;
END;
$$;

-- ============================================================================
-- ATUALIZAR CONFIGURAÇÕES DO BUCKET (SE JÁ EXISTE)
-- ============================================================================

-- Garantir que bucket não seja público e tenha limite de tamanho adequado
UPDATE storage.buckets
SET
    public = false,
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
WHERE id = 'contract-documents';

-- ============================================================================
-- VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar políticas criadas
DO $$
DECLARE
    v_policy_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%contract-documents%';

    RAISE NOTICE '✅ Total de políticas RLS para contract-documents: %', v_policy_count;
END;
$$;

-- Listar todas as políticas
SELECT
    policyname,
    cmd as operacao,
    permissive as permissiva,
    roles as para_roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%contract-documents%'
ORDER BY cmd, policyname;

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

/*
RESUMO DAS POLÍTICAS RLS:

1. INSERT (Upload):
   - Qualquer usuário autenticado pode fazer upload
   - Não há restrição por user_id (permite multi-tenant)

2. SELECT (Visualização):
   - Qualquer usuário autenticado pode visualizar
   - Recomendação: Adicionar filtro por user_id se necessário privacidade

3. UPDATE (Atualização):
   - Qualquer usuário autenticado pode atualizar metadados
   - Arquivos do bucket são acessíveis por todos os usuários

4. DELETE (Exclusão):
   - Qualquer usuário autenticado pode deletar
   - Considerar adicionar restrição por owner se necessário

ATENÇÃO:
- Bucket configurado como NÃO PÚBLICO (public = false)
- Requer autenticação para acesso
- Limite de 50MB por arquivo
- Tipos de arquivo permitidos: imagens, PDF, Word, Excel, CSV

ESTRUTURA DE PATHS:
- contracts/temp/{filename} - Arquivos temporários durante upload
- contracts/{contract_id}/{filename} - Arquivos finalizados do contrato
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00053_fix_contract_documents_storage_rls.sql aplicada com sucesso';
    RAISE NOTICE '🗂️ Bucket: contract-documents configurado';
    RAISE NOTICE '🔒 RLS: Políticas permissivas para authenticated users';
    RAISE NOTICE '📤 Permitido: Upload, visualização, atualização e exclusão';
END;
$$;


-- ==============================================
-- = MIGRATION: 00054_fix_storage_rls_for_anon.sql
-- ==============================================
-- Migration: Fix storage RLS policies to accept anon role
-- Description: Ajusta políticas para aceitar tanto authenticated quanto anon role
-- Created: 2025-01-04

-- ============================================================================
-- CORREÇÃO DE RLS - PERMITIR ANON ROLE
-- ============================================================================

-- O sistema usa JWT customizado do FastAPI, não o JWT do Supabase
-- Por isso o cliente Supabase acessa com anon role, não authenticated
-- Vamos ajustar as políticas para aceitar anon role também

-- ============================================================================
-- CONTRACT-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;

-- Criar políticas que aceitam anon role (com anon key válida)
DROP POLICY IF EXISTS "Allow upload to contract-documents" ON storage.objects;
CREATE POLICY "Allow upload to contract-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'contract-documents'
);

DROP POLICY IF EXISTS "Allow view contract-documents" ON storage.objects;
CREATE POLICY "Allow view contract-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'contract-documents'
);

DROP POLICY IF EXISTS "Allow update contract-documents" ON storage.objects;
CREATE POLICY "Allow update contract-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Allow delete contract-documents" ON storage.objects;
CREATE POLICY "Allow delete contract-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'contract-documents'
);

-- ============================================================================
-- CLIENT-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;

-- Criar políticas que aceitam anon role
DROP POLICY IF EXISTS "Allow upload to client-documents" ON storage.objects;
CREATE POLICY "Allow upload to client-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'client-documents'
);

DROP POLICY IF EXISTS "Allow view client-documents" ON storage.objects;
CREATE POLICY "Allow view client-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'client-documents'
);

DROP POLICY IF EXISTS "Allow update client-documents" ON storage.objects;
CREATE POLICY "Allow update client-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Allow delete client-documents" ON storage.objects;
CREATE POLICY "Allow delete client-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'client-documents'
);

-- ============================================================================
-- MAINTENANCE-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;

-- Criar políticas que aceitam anon role
DROP POLICY IF EXISTS "Allow upload to maintenance-documents" ON storage.objects;
CREATE POLICY "Allow upload to maintenance-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'maintenance-documents'
);

DROP POLICY IF EXISTS "Allow view maintenance-documents" ON storage.objects;
CREATE POLICY "Allow view maintenance-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'maintenance-documents'
);

DROP POLICY IF EXISTS "Allow update maintenance-documents" ON storage.objects;
CREATE POLICY "Allow update maintenance-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'maintenance-documents')
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Allow delete maintenance-documents" ON storage.objects;
CREATE POLICY "Allow delete maintenance-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'maintenance-documents'
);

-- ============================================================================
-- VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar políticas criadas para cada bucket
DO $$
DECLARE
    v_contract_policies integer;
    v_client_policies integer;
    v_maintenance_policies integer;
BEGIN
    SELECT COUNT(*) INTO v_contract_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%contract-documents%';

    SELECT COUNT(*) INTO v_client_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%client-documents%';

    SELECT COUNT(*) INTO v_maintenance_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%maintenance-documents%';

    RAISE NOTICE '✅ Políticas RLS criadas:';
    RAISE NOTICE '   - contract-documents: % políticas', v_contract_policies;
    RAISE NOTICE '   - client-documents: % políticas', v_client_policies;
    RAISE NOTICE '   - maintenance-documents: % políticas', v_maintenance_policies;
END;
$$;

-- Listar todas as políticas de storage
SELECT
    policyname,
    cmd as operacao,
    roles as para_roles
FROM pg_policies
WHERE tablename = 'objects'
AND (
    policyname LIKE '%contract-documents%'
    OR policyname LIKE '%client-documents%'
    OR policyname LIKE '%maintenance-documents%'
)
ORDER BY policyname;

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

/*
RESUMO DAS POLÍTICAS RLS:

IMPORTANTE: Políticas permitem acesso via anon role
- O sistema usa JWT customizado do FastAPI, não o JWT do Supabase
- O cliente Supabase acessa com anon key (role: anon)
- A anon key é pública mas válida apenas com SUPABASE_URL correto
- Buckets são NÃO PÚBLICOS (public = false), exigem anon key válida

SEGURANÇA:
1. Bucket não é público → requer anon key válida do Supabase
2. Anon key só funciona com SUPABASE_URL correto
3. Frontend valida JWT customizado do FastAPI antes de chamar storage
4. Controle de acesso é feito na camada de aplicação (FastAPI)

OPERAÇÕES PERMITIDAS:
- INSERT (Upload): anon, authenticated
- SELECT (Visualização): anon, authenticated
- UPDATE (Atualização): anon, authenticated
- DELETE (Exclusão): anon, authenticated

BUCKETS CONFIGURADOS:
- contract-documents (50MB, PDF, imagens, Word, Excel, CSV)
- client-documents (10MB, imagens, PDF, Word, Excel)
- maintenance-documents (50MB, PDF, imagens, Word, Excel)

ESTRUTURA DE PATHS:
- contracts/temp/{filename} - Arquivos temporários
- contracts/{contract_id}/{filename} - Arquivos do contrato
- clients/{client_id}/{filename} - Arquivos do cliente
- maintenances/{maintenance_id}/{filename} - Arquivos da manutenção
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00054_fix_storage_rls_for_anon.sql aplicada com sucesso';
    RAISE NOTICE '🔓 Buckets agora aceitam anon role (com anon key válida)';
    RAISE NOTICE '🔒 Buckets continuam não-públicos (exigem autenticação)';
    RAISE NOTICE '✨ Upload deve funcionar com JWT customizado do FastAPI';
END;
$$;


-- ==============================================
-- = MIGRATION: 00055_add_user_roles.sql
-- ==============================================
-- Add role column to profiles table
-- This migration adds role-based access control to the system
-- Profiles table has 1:1 relationship with auth.users

-- Add role column with default 'user'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

-- Add check constraint to ensure only valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
          CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing profiles to have 'user' role by default
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Comment on the column
COMMENT ON COLUMN profiles.role IS 'User role: admin or user. Controls access to admin features.';


-- ==============================================
-- = MIGRATION: 00056_add_is_active_to_profiles.sql
-- ==============================================
-- Add is_active column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster lookups on active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Update existing profiles to have is_active = true by default
UPDATE profiles SET is_active = true WHERE is_active IS NULL;


-- ==============================================
-- = MIGRATION: 00057_backlog_recorrentes_report.sql
-- ==============================================
-- Migration: Backlog Recorrentes Report
-- Description: Adiciona estrutura para o Relatório 2 - Backlogs Recorrentes e Não Resolvidos
-- Date: 2025-12-03

-- ==============================================
-- ADICIONAR COLUNAS NECESSÁRIAS
-- ==============================================

ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS backlog_recommendation TEXT;

-- ==============================================
-- TABELA: HISTÓRICO DE REPROGRAMAÇÕES
-- ==============================================

CREATE TABLE IF NOT EXISTS maintenance_reschedule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    old_scheduled_date DATE,
    new_scheduled_date DATE,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas por manutenção
CREATE INDEX IF NOT EXISTS idx_reschedule_history_maintenance_id
    ON maintenance_reschedule_history(maintenance_id);

-- ==============================================
-- FUNÇÃO: RASTREAR REPROGRAMAÇÕES AUTOMATICAMENTE
-- ==============================================

CREATE OR REPLACE FUNCTION track_maintenance_reschedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a data agendada mudou (reprogramação)
    IF OLD.scheduled_date IS NOT NULL
       AND NEW.scheduled_date IS NOT NULL
       AND OLD.scheduled_date::DATE != NEW.scheduled_date::DATE THEN

        -- Incrementar contador de reprogramações
        NEW.reschedule_count = COALESCE(OLD.reschedule_count, 0) + 1;
        NEW.updated_at = NOW();

        -- Registrar no histórico
        INSERT INTO maintenance_reschedule_history (
            maintenance_id,
            old_scheduled_date,
            new_scheduled_date,
            reason
        ) VALUES (
            NEW.id,
            OLD.scheduled_date::DATE,
            NEW.scheduled_date::DATE,
            'Reprogramação automática detectada'
        );

        RAISE NOTICE 'Manutenção % reprogramada: % -> % (total: %)',
            NEW.id, OLD.scheduled_date, NEW.scheduled_date, NEW.reschedule_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGER: RASTREAR REPROGRAMAÇÕES
-- ==============================================

DROP TRIGGER IF EXISTS trigger_track_maintenance_reschedule ON maintenances;
CREATE TRIGGER trigger_track_maintenance_reschedule
    BEFORE UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION track_maintenance_reschedule();

-- ==============================================
-- MIGRAÇÃO DE DADOS HISTÓRICOS
-- Estimar reprogramações baseado em datas
-- ==============================================

-- Atualizar manutenções existentes com estimativa de reprogramações
UPDATE maintenances
SET reschedule_count = CASE
    -- Se updated_at > created_at + 24h e tem data agendada, provavelmente foi reprogramado
    WHEN updated_at > created_at + INTERVAL '24 hours'
         AND scheduled_date IS NOT NULL
    THEN 1
    ELSE 0
END
WHERE reschedule_count IS NULL OR reschedule_count = 0;

-- ==============================================
-- VIEW: BACKLOGS RECORRENTES
-- ==============================================

DROP VIEW IF EXISTS vw_backlogs_recorrentes CASCADE;
CREATE VIEW vw_backlogs_recorrentes AS
SELECT
    m.id,
    m.contract_id,
    m.type AS maintenance_type_id,  -- coluna real é 'type', não 'maintenance_type'
    m.scheduled_date,
    m.completed_date,
    m.status,
    m.notes,
    m.technician,  -- VARCHAR(255), guarda nome diretamente
    m.created_at,
    m.updated_at,
    m.reschedule_count,
    m.backlog_recommendation,
    -- Dados do contrato
    c.contract_number,
    c.client_id,
    -- Dados do cliente
    cl.name AS client_name,
    -- Tipo de manutenção (coluna 'type' VARCHAR)
    m.type AS maintenance_type_name,
    m.type AS maintenance_type_code,
    -- Técnico (já é VARCHAR com nome, não precisa JOIN)
    m.technician AS technician_name,
    -- Dias em aberto (apenas para não concluídas)
    CASE
        WHEN m.status NOT IN ('completed', 'cancelled') AND m.scheduled_date IS NOT NULL
        THEN GREATEST(0, CURRENT_DATE - m.scheduled_date::DATE)
        ELSE 0
    END AS dias_em_aberto,
    -- Progresso baseado em status
    CASE m.status
        WHEN 'completed' THEN 100
        WHEN 'in_progress' THEN 50
        WHEN 'confirmed' THEN 30
        WHEN 'scheduled' THEN 10
        WHEN 'pending' THEN 5
        ELSE 0
    END AS progress_percent,
    -- Flag de backlog crítico (atrasado > 30 dias)
    CASE
        WHEN m.status = 'overdue'
             AND (CURRENT_DATE - m.scheduled_date::DATE) > 30
        THEN true
        WHEN m.status NOT IN ('completed', 'cancelled')
             AND m.scheduled_date IS NOT NULL
             AND (CURRENT_DATE - m.scheduled_date::DATE) > 30
        THEN true
        ELSE false
    END AS is_critical_backlog,
    -- Flag de reprogramado
    CASE
        WHEN COALESCE(m.reschedule_count, 0) > 0 THEN true
        ELSE false
    END AS is_rescheduled
FROM maintenances m
LEFT JOIN contracts c ON m.contract_id = c.id
LEFT JOIN clients cl ON c.client_id = cl.id;

-- ==============================================
-- FUNÇÃO: GERAR RECOMENDAÇÃO AUTOMÁTICA
-- ==============================================

CREATE OR REPLACE FUNCTION generate_backlog_recommendation(
    p_maintenance_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_dias_aberto INTEGER;
    v_reprogramacoes INTEGER;
    v_status VARCHAR;
    v_recommendation TEXT;
BEGIN
    -- Buscar dados da manutenção
    SELECT
        GREATEST(0, CURRENT_DATE - scheduled_date::DATE),
        COALESCE(reschedule_count, 0),
        status
    INTO v_dias_aberto, v_reprogramacoes, v_status
    FROM maintenances
    WHERE id = p_maintenance_id;

    -- Gerar recomendação baseada nas métricas
    IF v_status = 'completed' THEN
        v_recommendation := 'Manutenção concluída com sucesso.';
    ELSIF v_dias_aberto > 60 AND v_reprogramacoes >= 3 THEN
        v_recommendation := 'CRÍTICO: Backlog crônico. Escalar para gerência e alocar equipe dedicada.';
    ELSIF v_dias_aberto > 30 AND v_reprogramacoes >= 2 THEN
        v_recommendation := 'URGENTE: Priorizar na próxima semana. Verificar disponibilidade de recursos.';
    ELSIF v_dias_aberto > 30 THEN
        v_recommendation := 'ATENÇÃO: Atraso significativo. Reagendar com prioridade alta.';
    ELSIF v_reprogramacoes >= 2 THEN
        v_recommendation := 'Múltiplas reprogramações. Investigar causa raiz dos adiamentos.';
    ELSIF v_dias_aberto > 7 THEN
        v_recommendation := 'Em atraso. Confirmar agendamento com cliente.';
    ELSE
        v_recommendation := 'Dentro do prazo esperado.';
    END IF;

    RETURN v_recommendation;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: ATUALIZAR RECOMENDAÇÕES EM LOTE
-- ==============================================

CREATE OR REPLACE FUNCTION update_backlog_recommendations()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_rec RECORD;
BEGIN
    FOR v_rec IN
        SELECT id
        FROM maintenances
        WHERE status NOT IN ('completed', 'cancelled')
    LOOP
        UPDATE maintenances
        SET backlog_recommendation = generate_backlog_recommendation(v_rec.id)
        WHERE id = v_rec.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNÇÃO: OBTER DADOS PARA CURVA S
-- ==============================================

CREATE OR REPLACE FUNCTION get_curva_s_data(
    p_start_date DATE,
    p_end_date DATE,
    p_contract_id UUID DEFAULT NULL
)
RETURNS TABLE (
    semana INTEGER,
    data_inicio DATE,
    data_fim DATE,
    planejado_semana INTEGER,
    planejado_acumulado INTEGER,
    real_semana INTEGER,
    real_acumulado INTEGER,
    planejado_percent NUMERIC,
    real_percent NUMERIC
) AS $$
DECLARE
    v_total_planejado INTEGER;
    v_semanas INTEGER;
BEGIN
    -- Calcular total de manutenções planejadas no período
    SELECT COUNT(*)
    INTO v_total_planejado
    FROM maintenances m
    WHERE m.scheduled_date BETWEEN p_start_date AND p_end_date
    AND (p_contract_id IS NULL OR m.contract_id = p_contract_id);

    -- Calcular número de semanas
    v_semanas := CEIL(EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 604800)::INTEGER;
    IF v_semanas < 1 THEN v_semanas := 1; END IF;

    RETURN QUERY
    WITH semanas AS (
        SELECT
            gs.n AS semana_num,
            p_start_date + ((gs.n - 1) * 7) AS inicio_semana,
            LEAST(p_start_date + (gs.n * 7) - 1, p_end_date) AS fim_semana
        FROM generate_series(1, v_semanas) AS gs(n)
    ),
    dados_semana AS (
        SELECT
            s.semana_num,
            s.inicio_semana,
            s.fim_semana,
            -- Planejado na semana
            COUNT(CASE
                WHEN m.scheduled_date BETWEEN s.inicio_semana AND s.fim_semana
                THEN 1
            END)::INTEGER AS plan_semana,
            -- Concluído na semana
            COUNT(CASE
                WHEN m.completed_date BETWEEN s.inicio_semana AND s.fim_semana
                     AND m.status = 'completed'
                THEN 1
            END)::INTEGER AS real_semana
        FROM semanas s
        LEFT JOIN maintenances m ON (
            m.scheduled_date BETWEEN p_start_date AND p_end_date
            AND (p_contract_id IS NULL OR m.contract_id = p_contract_id)
        )
        GROUP BY s.semana_num, s.inicio_semana, s.fim_semana
    )
    SELECT
        ds.semana_num::INTEGER,
        ds.inicio_semana::DATE,
        ds.fim_semana::DATE,
        ds.plan_semana::INTEGER,
        SUM(ds.plan_semana) OVER (ORDER BY ds.semana_num)::INTEGER AS plan_acum,
        ds.real_semana::INTEGER,
        SUM(ds.real_semana) OVER (ORDER BY ds.semana_num)::INTEGER AS real_acum,
        CASE
            WHEN v_total_planejado > 0
            THEN ROUND((SUM(ds.plan_semana) OVER (ORDER BY ds.semana_num)::NUMERIC / v_total_planejado) * 100, 2)
            ELSE 0
        END AS plan_pct,
        CASE
            WHEN v_total_planejado > 0
            THEN ROUND((SUM(ds.real_semana) OVER (ORDER BY ds.semana_num)::NUMERIC / v_total_planejado) * 100, 2)
            ELSE 0
        END AS real_pct
    FROM dados_semana ds
    ORDER BY ds.semana_num;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_maintenances_reschedule_count
    ON maintenances(reschedule_count);
CREATE INDEX IF NOT EXISTS idx_maintenances_backlog_recommendation
    ON maintenances(backlog_recommendation)
    WHERE backlog_recommendation IS NOT NULL;

-- Índice composto para consultas do relatório
CREATE INDEX IF NOT EXISTS idx_maintenances_backlog_report
    ON maintenances(status, scheduled_date, reschedule_count)
    WHERE status NOT IN ('completed', 'cancelled');

-- ==============================================
-- ATUALIZAR RECOMENDAÇÕES INICIAIS
-- ==============================================

SELECT update_backlog_recommendations();

-- ==============================================
-- COMENTÁRIOS
-- ==============================================

COMMENT ON COLUMN maintenances.reschedule_count IS 'Quantidade de vezes que a manutenção foi reprogramada';
COMMENT ON COLUMN maintenances.backlog_recommendation IS 'Recomendação gerada pelo sistema ou editada manualmente';

COMMENT ON TABLE maintenance_reschedule_history IS 'Histórico de reprogramações de manutenções';

COMMENT ON VIEW vw_backlogs_recorrentes IS 'View para o Relatório 2 - Backlogs Recorrentes';

COMMENT ON FUNCTION track_maintenance_reschedule() IS 'Trigger que rastreia reprogramações automaticamente';
COMMENT ON FUNCTION generate_backlog_recommendation(UUID) IS 'Gera recomendação automática para uma manutenção';
COMMENT ON FUNCTION update_backlog_recommendations() IS 'Atualiza recomendações de todas as manutenções em aberto';
COMMENT ON FUNCTION get_curva_s_data(DATE, DATE, UUID) IS 'Retorna dados para gráfico Curva S (planejado vs realizado)';


-- ==============================================
-- = MIGRATION: 00058_create_regions_table.sql
-- ==============================================
-- Migration: Create regions table and add region_id to clients and maintenances
-- Date: 2025-12-12

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',  -- Hex color for visual identification (default: indigo)
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_regions_user_id ON regions(user_id);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- 3. Add region_id to clients table (optional field)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_region_id ON clients(region_id);

-- 4. Add region_id to maintenances table (optional field)
ALTER TABLE maintenances
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenances_region_id ON maintenances(region_id);

-- 5. Enable RLS on regions table
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for regions
DROP POLICY IF EXISTS "Users can view their own regions" ON regions;
CREATE POLICY "Users can view their own regions" ON regions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own regions" ON regions;
CREATE POLICY "Users can insert their own regions" ON regions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own regions" ON regions;
CREATE POLICY "Users can update their own regions" ON regions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own regions" ON regions;
CREATE POLICY "Users can delete their own regions" ON regions
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_regions_updated_at ON regions;
CREATE TRIGGER trigger_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_regions_updated_at();

-- 8. Add comment to tables
COMMENT ON TABLE regions IS 'Stores region/area definitions for organizing clients and maintenances';
COMMENT ON COLUMN regions.color IS 'Hex color code for visual identification in reports and badges';
COMMENT ON COLUMN clients.region_id IS 'Optional reference to region for client organization';
COMMENT ON COLUMN maintenances.region_id IS 'Optional reference to region, can be inherited from client';


-- ==============================================
-- = MIGRATION: 00059_contract_addendums.sql
-- ==============================================
-- Migration: Create contract_addendums and pending_contract_changes tables
-- Description: Tables for contract addendum management with approval workflow
-- Date: 2025-01-17

-- =============================================
-- TABLE: contract_addendums
-- Stores uploaded addendum documents with extraction results
-- =============================================
-- Drop existing table if schema mismatch (no data loss if empty)
DROP TABLE IF EXISTS pending_contract_changes CASCADE;
DROP TABLE IF EXISTS contract_addendums CASCADE;

CREATE TABLE contract_addendums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

    -- Metadata
    addendum_number INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,

    -- File storage
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size BIGINT,

    -- Extraction data
    content_extracted TEXT,
    extracted_insights JSONB DEFAULT '{}',
    extraction_method VARCHAR(50),
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,

    -- Workflow status
    status VARCHAR(50) DEFAULT 'uploaded',
    applied_at TIMESTAMPTZ,

    -- Audit fields
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE contract_addendums IS 'Contract addendums (aditivos) with extracted insights';
COMMENT ON COLUMN contract_addendums.addendum_number IS 'Sequential number of the addendum (1, 2, 3...)';
COMMENT ON COLUMN contract_addendums.extracted_insights IS 'JSON containing AI-extracted insights from the addendum';
COMMENT ON COLUMN contract_addendums.processing_status IS 'Status: pending, processing, completed, error';
COMMENT ON COLUMN contract_addendums.status IS 'Workflow status: uploaded, analyzed, applied, rejected';

-- =============================================
-- TABLE: pending_contract_changes
-- Stores suggested changes from addendum extraction awaiting approval
-- =============================================
CREATE TABLE pending_contract_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addendum_id UUID NOT NULL REFERENCES contract_addendums(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

    -- Change specification
    change_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    current_value TEXT,
    suggested_value TEXT,
    change_description TEXT,
    confidence_score DECIMAL(3, 2),

    -- Approval workflow
    status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,

    -- For new maintenance items
    maintenance_data JSONB,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE pending_contract_changes IS 'Suggested changes from addendum extraction awaiting user approval';
COMMENT ON COLUMN pending_contract_changes.change_type IS 'Type: date_change, value_change, service_add, service_remove, maintenance_add, equipment_update, condition_change';
COMMENT ON COLUMN pending_contract_changes.confidence_score IS 'AI confidence score (0.00-1.00) for the suggested change';
COMMENT ON COLUMN pending_contract_changes.maintenance_data IS 'JSON data for new maintenance items to be created';
COMMENT ON COLUMN pending_contract_changes.status IS 'Status: pending, approved, rejected, applied';

-- =============================================
-- INDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_contract_addendums_contract_id ON contract_addendums(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_processing_status ON contract_addendums(processing_status);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_status ON contract_addendums(status);
CREATE INDEX IF NOT EXISTS idx_contract_addendums_user_id ON contract_addendums(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_changes_addendum_id ON pending_contract_changes(addendum_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_contract_id ON pending_contract_changes(contract_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_status ON pending_contract_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_change_type ON pending_contract_changes(change_type);

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_contract_addendums_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contract_addendums_timestamp ON contract_addendums;
CREATE TRIGGER trigger_update_contract_addendums_timestamp
    BEFORE UPDATE ON contract_addendums
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_addendums_timestamp();

DROP TRIGGER IF EXISTS trigger_update_pending_changes_timestamp ON pending_contract_changes;
CREATE TRIGGER trigger_update_pending_changes_timestamp
    BEFORE UPDATE ON pending_contract_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_addendums_timestamp();

-- =============================================
-- RLS POLICIES (disabled for simplicity, like other tables)
-- =============================================
ALTER TABLE contract_addendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_contract_changes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (consistent with other tables)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON contract_addendums;
CREATE POLICY "Enable all for authenticated users" ON contract_addendums
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON pending_contract_changes;
CREATE POLICY "Enable all for authenticated users" ON pending_contract_changes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow service_role full access
DROP POLICY IF EXISTS "Enable all for service_role" ON contract_addendums;
CREATE POLICY "Enable all for service_role" ON contract_addendums
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for service_role" ON pending_contract_changes;
CREATE POLICY "Enable all for service_role" ON pending_contract_changes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ==============================================
-- = MIGRATION: 00060_add_contract_value_column.sql
-- ==============================================
-- Migration: Add contract_value column to contracts table
-- This column stores the total contract value (as distinct from monthly_value)

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_value DECIMAL(15, 2) DEFAULT 0;

-- Add comment explaining the difference between value, monthly_value, and contract_value
COMMENT ON COLUMN contracts.contract_value IS 'Total contract value (valor total do contrato)';
COMMENT ON COLUMN contracts.value IS 'Legacy value field - use contract_value for total value';
COMMENT ON COLUMN contracts.monthly_value IS 'Monthly payment value (valor mensal/mensalidade)';

-- Update contract_value from existing value field where contract_value is null or 0
UPDATE contracts
SET contract_value = COALESCE(value, 0)
WHERE contract_value IS NULL OR contract_value = 0;


-- ==============================================
-- = MIGRATION: 00061_add_ai_fields_to_contract_documents.sql
-- ==============================================
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


-- ==============================================
-- = MIGRATION: 00062_add_identity_validation_column.sql
-- ==============================================
-- Migration: Add identity_validation column to store AI validation results
-- This column stores the result of validating if a document belongs to the correct contract

-- Add identity_validation to contract_addendums
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_addendums' AND column_name = 'identity_validation'
    ) THEN
        ALTER TABLE contract_addendums
        ADD COLUMN identity_validation JSONB DEFAULT NULL;

        COMMENT ON COLUMN contract_addendums.identity_validation IS 'AI validation result checking if document belongs to the correct contract';
    END IF;
END $$;

-- Add identity_validation to contract_documents (for general documents)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contract_documents' AND column_name = 'identity_validation'
    ) THEN
        ALTER TABLE contract_documents
        ADD COLUMN identity_validation JSONB DEFAULT NULL;

        COMMENT ON COLUMN contract_documents.identity_validation IS 'AI validation result checking if document belongs to the correct contract';
    END IF;
END $$;

-- Create index for querying by validation status
CREATE INDEX IF NOT EXISTS idx_contract_addendums_validation_status
ON contract_addendums ((identity_validation->>'validation_status'))
WHERE identity_validation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_documents_validation_status
ON contract_documents ((identity_validation->>'validation_status'))
WHERE identity_validation IS NOT NULL;


-- ==============================================
-- = MIGRATION: 00063_remove_region_from_clients.sql
-- ==============================================
-- Migration: Remove region_id from clients table
-- Description: Move region association exclusively to maintenances table
-- Date: 2025-01-20

-- =============================================
-- REMOVE REGION_ID FROM CLIENTS
-- =============================================

-- Remove the index first
DROP INDEX IF EXISTS idx_clients_region_id;

-- Remove the foreign key constraint (if exists)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_region_id_fkey;

-- Remove the column
ALTER TABLE clients DROP COLUMN IF EXISTS region_id;

-- =============================================
-- LOG
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00063: region_id removed from clients table';
    RAISE NOTICE '📍 Region is now managed exclusively in maintenances table';
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE clients IS 'Client information - region is managed per maintenance, not per client';



-- ================================================================================
-- END OF MIGRATIONS
-- ================================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'Luminus AI Hub consolidated migrations completed successfully!';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of changes:';
    RAISE NOTICE '- Core tables created (clients, contracts, maintenances, equipment, etc.)';
    RAISE NOTICE '- Storage buckets configured (contract-documents, client-documents, maintenance-documents)';
    RAISE NOTICE '- Row Level Security (RLS) policies established';
    RAISE NOTICE '- Helper functions created (CNPJ validation, timezone handling, etc.)';
    RAISE NOTICE '- Indexes created for performance optimization';
    RAISE NOTICE '- Triggers configured for automatic timestamp updates';
    RAISE NOTICE '- Default data inserted (status tables, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify all tables were created: SELECT tablename FROM pg_tables WHERE schemaname = ''public'' ORDER BY tablename;';
    RAISE NOTICE '2. Check RLS policies: SELECT * FROM pg_policies ORDER BY tablename, policyname;';
    RAISE NOTICE '3. Verify storage buckets: SELECT * FROM storage.buckets;';
    RAISE NOTICE '4. Test application connectivity and functionality';
    RAISE NOTICE '';
    RAISE NOTICE '================================================================================';
END $$;

-- Commit transaction
COMMIT;

-- ================================================================================
-- VERIFICATION QUERIES (OPTIONAL - Uncomment to run)
-- ================================================================================

-- List all tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- List all RLS policies
-- SELECT tablename, policyname, cmd FROM pg_policies ORDER BY tablename, policyname;

-- List all storage buckets
-- SELECT * FROM storage.buckets;

-- Check client_status data
-- SELECT * FROM client_status ORDER BY name;

-- Check maintenance_status data
-- SELECT * FROM maintenance_status ORDER BY order_index;

-- Check timezone configuration
-- SHOW timezone;
-- SELECT * FROM _timezone_config;

-- ================================================================================
-- END OF FILE
-- ================================================================================



