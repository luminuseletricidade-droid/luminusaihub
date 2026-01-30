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
