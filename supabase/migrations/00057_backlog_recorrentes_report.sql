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
