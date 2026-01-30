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