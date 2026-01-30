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
