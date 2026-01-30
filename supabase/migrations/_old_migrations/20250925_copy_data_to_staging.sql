-- Copy existing data from public to staging schema
-- This migration copies reference data and user profiles

-- Copy profiles (user profiles)
INSERT INTO staging.profiles (user_id, full_name, avatar_url, created_at, updated_at)
SELECT user_id, full_name, avatar_url, created_at, updated_at
FROM public.profiles
WHERE NOT EXISTS (
    SELECT 1 FROM staging.profiles sp
    WHERE sp.user_id = public.profiles.user_id
);

-- Copy user roles
INSERT INTO staging.user_roles (user_id, role, created_at, updated_at)
SELECT user_id, role, created_at, updated_at
FROM public.user_roles
WHERE NOT EXISTS (
    SELECT 1 FROM staging.user_roles sr
    WHERE sr.user_id = public.user_roles.user_id
    AND sr.role = public.user_roles.role
);

-- Copy AI agents configuration
INSERT INTO staging.ai_agents (name, type, description, avatar, is_active, created_at, updated_at, metadata)
SELECT name, type, description, avatar, is_active, created_at, updated_at, metadata
FROM public.ai_agents
WHERE NOT EXISTS (
    SELECT 1 FROM staging.ai_agents sa
    WHERE sa.name = public.ai_agents.name
    AND sa.type = public.ai_agents.type
);

-- Copy client status options
INSERT INTO staging.client_status (name, color, description, is_active, created_at, updated_at)
SELECT name, color, description, is_active, created_at, updated_at
FROM public.client_status
WHERE NOT EXISTS (
    SELECT 1 FROM staging.client_status scs
    WHERE scs.name = public.client_status.name
);

-- Copy maintenance status options
INSERT INTO staging.maintenance_status (name, color, description, is_active, created_at, updated_at)
SELECT name, color, description, is_active, created_at, updated_at
FROM public.maintenance_status
WHERE NOT EXISTS (
    SELECT 1 FROM staging.maintenance_status sms
    WHERE sms.name = public.maintenance_status.name
);

-- Add default data if tables are empty
-- Default AI Agents (if none exist)
INSERT INTO staging.ai_agents (name, type, description, avatar, is_active)
SELECT * FROM (VALUES
    ('Assistente de Contratos', 'contract_assistant', 'Analisa e extrai informações de contratos', '📄', true),
    ('Planejador de Manutenção', 'maintenance_planner', 'Cria cronogramas de manutenção preventiva', '🔧', true),
    ('Gerador de Relatórios', 'report_generator', 'Gera relatórios analíticos', '📊', true),
    ('Chat Inteligente', 'smart_chat', 'Responde perguntas sobre contratos e manutenções', '💬', true)
) AS v(name, type, description, avatar, is_active)
WHERE NOT EXISTS (SELECT 1 FROM staging.ai_agents);

-- Default Client Status (if none exist)
INSERT INTO staging.client_status (name, color, description, is_active)
SELECT * FROM (VALUES
    ('Ativo', '#10b981', 'Cliente com contrato ativo', true),
    ('Inativo', '#6b7280', 'Cliente sem contrato ativo', true),
    ('Suspenso', '#f59e0b', 'Cliente com contrato suspenso', true),
    ('Cancelado', '#ef4444', 'Cliente com contrato cancelado', true)
) AS v(name, color, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM staging.client_status);

-- Default Maintenance Status (if none exist)
INSERT INTO staging.maintenance_status (name, color, description, is_active)
SELECT * FROM (VALUES
    ('Pendente', '#6b7280', 'Manutenção agendada', true),
    ('Em Andamento', '#3b82f6', 'Manutenção em execução', true),
    ('Concluída', '#10b981', 'Manutenção finalizada', true),
    ('Cancelada', '#ef4444', 'Manutenção cancelada', true),
    ('Atrasada', '#f59e0b', 'Manutenção com atraso', true)
) AS v(name, color, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM staging.maintenance_status);