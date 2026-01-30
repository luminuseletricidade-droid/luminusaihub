-- Complete Initial Schema for Luminus AI Hub
-- Date: 2025-10-02
-- Description: Creates all necessary tables for production environment

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- CORE BUSINESS TABLES
-- ==============================================

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Brasil',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    value DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'active',
    payment_terms TEXT,
    notes TEXT,
    equipment_type VARCHAR(100),
    equipment_brand VARCHAR(100),
    equipment_model VARCHAR(100),
    equipment_serial VARCHAR(100),
    equipment_location TEXT,
    maintenance_plan JSONB,
    services JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Documents table
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    description TEXT,
    content TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT false
);

-- Contract Services table
CREATE TABLE IF NOT EXISTS contract_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT,
    value DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- Contract Context table
CREATE TABLE IF NOT EXISTS contract_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    content JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- ==============================================
-- STATUS TABLES
-- ==============================================

-- Client Status table
CREATE TABLE IF NOT EXISTS client_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Status table
CREATE TABLE IF NOT EXISTS maintenance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(50),
    icon VARCHAR(50),
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance statuses
INSERT INTO maintenance_status (name, description, color, icon, order_index)
VALUES
    ('scheduled', 'Agendada', '#3b82f6', 'calendar', 1),
    ('in_progress', 'Em Andamento', '#f59e0b', 'play-circle', 2),
    ('completed', 'Concluída', '#10b981', 'check-circle', 3),
    ('cancelled', 'Cancelada', '#6b7280', 'x-circle', 4),
    ('overdue', 'Atrasada', '#dc2626', 'alert-circle', 5)
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- MAINTENANCE TABLES
-- ==============================================

-- Maintenances table
CREATE TABLE IF NOT EXISTS maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    status_id UUID REFERENCES maintenance_status(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME DEFAULT '09:00:00',
    completed_date TIMESTAMP WITH TIME ZONE,
    technician VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    description TEXT,
    notes TEXT,
    checklist JSONB,
    photos JSONB,
    estimated_duration INTEGER DEFAULT 120,
    actual_duration INTEGER,
    equipment_id VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    is_overdue BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Checklists table
CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Documents table
CREATE TABLE IF NOT EXISTS maintenance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT false
);

-- Maintenance Context table
CREATE TABLE IF NOT EXISTS maintenance_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    content JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- Maintenance Status History table
CREATE TABLE IF NOT EXISTS maintenance_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- EQUIPMENT TABLES
-- ==============================================

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
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
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- CLIENT DOCUMENT TABLES
-- ==============================================

-- Client Documents table
CREATE TABLE IF NOT EXISTS client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT false
);

-- ==============================================
-- AI & AGENT TABLES
-- ==============================================

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    system_prompt TEXT,
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    is_active BOOLEAN DEFAULT true,
    config JSONB,
    metadata JSONB,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Documents table
CREATE TABLE IF NOT EXISTS agent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    session_id UUID,
    agent_type TEXT NOT NULL,
    document_type TEXT,
    file_name TEXT,
    file_path TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- Agent Executions table
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    session_id UUID,
    agent_type TEXT NOT NULL,
    execution_status TEXT,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- AI Generated Plans table
CREATE TABLE IF NOT EXISTS ai_generated_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'Pendente',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
);

-- AI Predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    equipment_id UUID,
    prediction_type TEXT NOT NULL,
    predicted_date DATE,
    confidence_score DECIMAL(3, 2),
    details JSONB,
    actual_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID
);

-- ==============================================
-- CHAT & SESSION TABLES
-- ==============================================

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    name TEXT,
    title VARCHAR(255),
    context JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    tokens_used INTEGER,
    user_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- REPORT & ANALYSIS TABLES
-- ==============================================

-- Generated Reports table
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    report_type VARCHAR(100),
    agent_type VARCHAR(100),
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Analysis table
CREATE TABLE IF NOT EXISTS document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    content TEXT,
    analysis TEXT,
    extracted_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- USER & AUTH TABLES
-- ==============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INDEXES
-- ==============================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- Contract Documents indexes
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_user_id ON contract_documents(user_id);

-- Contract Services indexes
CREATE INDEX IF NOT EXISTS idx_contract_services_contract_id ON contract_services(contract_id);

-- Contract Context indexes
CREATE INDEX IF NOT EXISTS idx_contract_context_contract_id ON contract_context(contract_id);

-- Maintenances indexes
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_contract_id ON maintenances(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_scheduled_date ON maintenances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenances_type ON maintenances(type);
CREATE INDEX IF NOT EXISTS idx_maintenances_status_id ON maintenances(status_id);

-- Maintenance Checklist indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_checklist_maintenance_id ON maintenance_checklist(maintenance_id);

-- Maintenance Documents indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_documents_maintenance_id ON maintenance_documents(maintenance_id);

-- Maintenance Context indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_context_maintenance_id ON maintenance_context(maintenance_id);

-- Maintenance Status History indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_status_history_maintenance_id ON maintenance_status_history(maintenance_id);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id ON equipment(contract_id);

-- Client Documents indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);

-- AI Agents indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);

-- Agent Documents indexes
CREATE INDEX IF NOT EXISTS idx_agent_documents_contract_id ON agent_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_agent_documents_session_id ON agent_documents(session_id);

-- Agent Executions indexes
CREATE INDEX IF NOT EXISTS idx_agent_executions_contract_id ON agent_executions(contract_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);

-- AI Generated Plans indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_plans_contract_id ON ai_generated_plans(contract_id);

-- AI Predictions indexes
CREATE INDEX IF NOT EXISTS idx_ai_predictions_contract_id ON ai_predictions(contract_id);

-- Chat Sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract_id ON chat_sessions(contract_id);

-- Chat Messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Generated Reports indexes
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_contract_id ON generated_reports(contract_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_report_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at);

-- Document Analysis indexes
CREATE INDEX IF NOT EXISTS idx_document_analysis_user_id ON document_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_status ON document_analysis(status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- User Roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- ==============================================
-- UPDATE TRIGGERS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_services_updated_at BEFORE UPDATE ON contract_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_context_updated_at BEFORE UPDATE ON contract_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_status_updated_at BEFORE UPDATE ON client_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_status_updated_at BEFORE UPDATE ON maintenance_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON maintenances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_checklist_updated_at BEFORE UPDATE ON maintenance_checklist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_context_updated_at BEFORE UPDATE ON maintenance_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_reports_updated_at BEFORE UPDATE ON generated_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_analysis_updated_at BEFORE UPDATE ON document_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================

COMMENT ON TABLE clients IS 'Stores client information';
COMMENT ON TABLE contracts IS 'Stores contract details and equipment information';
COMMENT ON TABLE contract_documents IS 'Documents related to contracts';
COMMENT ON TABLE contract_services IS 'Services included in contracts';
COMMENT ON TABLE contract_context IS 'Additional context and metadata for contracts';
COMMENT ON TABLE client_status IS 'Status types for clients';
COMMENT ON TABLE maintenance_status IS 'Predefined maintenance status types';
COMMENT ON TABLE maintenances IS 'Maintenance records and schedules';
COMMENT ON TABLE maintenance_checklist IS 'Checklist items for maintenance tasks';
COMMENT ON TABLE maintenance_documents IS 'Documents related to maintenance tasks';
COMMENT ON TABLE maintenance_context IS 'Additional context for maintenance tasks';
COMMENT ON TABLE maintenance_status_history IS 'History of maintenance status changes';
COMMENT ON TABLE equipment IS 'Equipment inventory linked to contracts';
COMMENT ON TABLE client_documents IS 'Documents related to clients';
COMMENT ON TABLE ai_agents IS 'AI agent configurations';
COMMENT ON TABLE agent_documents IS 'Documents processed by AI agents';
COMMENT ON TABLE agent_executions IS 'Execution history of AI agents';
COMMENT ON TABLE ai_generated_plans IS 'Plans generated by AI';
COMMENT ON TABLE ai_predictions IS 'Predictive maintenance AI predictions';
COMMENT ON TABLE chat_sessions IS 'Chat conversation sessions';
COMMENT ON TABLE chat_messages IS 'Individual chat messages';
COMMENT ON TABLE generated_reports IS 'AI-generated reports';
COMMENT ON TABLE document_analysis IS 'Document analysis results';
COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON TABLE user_roles IS 'User roles and permissions';
