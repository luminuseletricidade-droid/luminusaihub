-- Complete staging schema migration
-- Creates all necessary tables for the staging environment

-- Create staging schema if not exists
CREATE SCHEMA IF NOT EXISTS staging;

-- Set search path
SET search_path TO staging, public;

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Clients table
CREATE TABLE IF NOT EXISTS staging.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- Contracts table
CREATE TABLE IF NOT EXISTS staging.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(255),
    client_id UUID REFERENCES staging.clients(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    value DECIMAL(10, 2),
    description TEXT,
    status VARCHAR(50),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Contract Documents table
CREATE TABLE IF NOT EXISTS staging.contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content TEXT,
    user_id UUID
);

-- Maintenances table
CREATE TABLE IF NOT EXISTS staging.maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente',
    priority VARCHAR(20) DEFAULT 'Média',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    is_overdue BOOLEAN DEFAULT false
);

-- Generated Reports table
CREATE TABLE IF NOT EXISTS staging.generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    content JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    agent_type VARCHAR(100)
);

-- AI Chat Messages table
CREATE TABLE IF NOT EXISTS staging.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    response TEXT,
    files JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- Contract Analyses table
CREATE TABLE IF NOT EXISTS staging.contract_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Checklists table
CREATE TABLE IF NOT EXISTS staging.maintenance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES staging.maintenances(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Stats table
CREATE TABLE IF NOT EXISTS staging.client_stats (
    client_id UUID PRIMARY KEY REFERENCES staging.clients(id) ON DELETE CASCADE,
    total_contracts INTEGER DEFAULT 0,
    active_contracts INTEGER DEFAULT 0,
    total_value DECIMAL(10, 2) DEFAULT 0,
    last_contract_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- USER & AUTH TABLES
-- ==============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS staging.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Roles table
CREATE TABLE IF NOT EXISTS staging.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- AI & AGENT TABLES
-- ==============================================

-- AI Agents table
CREATE TABLE IF NOT EXISTS staging.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Agent Documents table
CREATE TABLE IF NOT EXISTS staging.agent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    session_id UUID,
    agent_type TEXT NOT NULL,
    document_type TEXT,
    file_name TEXT,
    file_path TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- Agent Executions table
CREATE TABLE IF NOT EXISTS staging.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    session_id UUID,
    agent_type TEXT NOT NULL,
    execution_status TEXT,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- AI Generated Plans table
CREATE TABLE IF NOT EXISTS staging.ai_generated_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'Pendente',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
);

-- AI Predictions table
CREATE TABLE IF NOT EXISTS staging.ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    equipment_id UUID,
    prediction_type TEXT NOT NULL,
    predicted_date DATE,
    confidence_score DECIMAL(3, 2),
    details JSONB,
    actual_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- ==============================================
-- CHAT & SESSION TABLES
-- ==============================================

-- Chat Messages table
CREATE TABLE IF NOT EXISTS staging.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    is_deleted BOOLEAN DEFAULT false
);

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS staging.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    contract_id TEXT,
    agent_id TEXT,
    user_id UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true
);

-- ==============================================
-- EQUIPMENT & SERVICE TABLES
-- ==============================================

-- Equipment table
CREATE TABLE IF NOT EXISTS staging.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'Ativo',
    installation_date DATE,
    last_maintenance DATE,
    next_maintenance DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contract Services table
CREATE TABLE IF NOT EXISTS staging.contract_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT,
    value DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- ==============================================
-- STATUS TABLES
-- ==============================================

-- Client Status table
CREATE TABLE IF NOT EXISTS staging.client_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Status table
CREATE TABLE IF NOT EXISTS staging.maintenance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- DOCUMENT TABLES
-- ==============================================

-- Client Documents table
CREATE TABLE IF NOT EXISTS staging.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES staging.clients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT false
);

-- Maintenance Documents table
CREATE TABLE IF NOT EXISTS staging.maintenance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES staging.maintenances(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT false
);

-- ==============================================
-- ADDITIONAL TABLES
-- ==============================================

-- Contract Context table
CREATE TABLE IF NOT EXISTS staging.contract_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES staging.contracts(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    content JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID
);

-- Maintenance Checklist Items table
CREATE TABLE IF NOT EXISTS staging.maintenance_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES staging.maintenance_checklists(id) ON DELETE CASCADE,
    maintenance_id UUID REFERENCES staging.maintenances(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    required BOOLEAN DEFAULT true,
    category TEXT,
    evidence_required BOOLEAN DEFAULT false,
    evidence_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- INDEXES
-- ==============================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON staging.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON staging.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON staging.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON staging.maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON staging.maintenances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON staging.maintenances(status);
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_id ON staging.generated_reports(contract_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_agent_type ON staging.generated_reports(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON staging.ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_maintenance_id ON staging.maintenance_checklists(maintenance_id);

-- User & Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON staging.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON staging.user_roles(user_id);

-- Equipment & Service indexes
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON staging.equipment(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_contract_id ON staging.contract_services(contract_id);

-- Agent & AI indexes
CREATE INDEX IF NOT EXISTS idx_agent_documents_contract_id ON staging.agent_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_contract_id ON staging.agent_executions(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_plans_contract_id ON staging.ai_generated_plans(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_contract_id ON staging.ai_predictions(contract_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON staging.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON staging.chat_sessions(user_id);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON staging.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_contract_context_contract_id ON staging.contract_context(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_documents_maintenance_id ON staging.maintenance_documents(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_items_checklist_id ON staging.maintenance_checklist_items(checklist_id);

-- ==============================================
-- COMMENTS
-- ==============================================

COMMENT ON SCHEMA staging IS 'Staging environment schema for testing and development';
COMMENT ON TABLE staging.clients IS 'Stores client information';
COMMENT ON TABLE staging.contracts IS 'Stores contract details linked to clients';
COMMENT ON TABLE staging.maintenances IS 'Stores maintenance schedules and tasks';
COMMENT ON TABLE staging.generated_reports IS 'Stores AI-generated reports';
COMMENT ON TABLE staging.ai_agents IS 'Configuration and metadata for AI agents';
COMMENT ON TABLE staging.equipment IS 'Equipment inventory linked to contracts';
COMMENT ON TABLE staging.contract_services IS 'Services included in contracts';