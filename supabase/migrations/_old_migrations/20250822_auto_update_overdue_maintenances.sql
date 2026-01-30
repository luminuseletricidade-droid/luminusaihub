-- Função para atualizar automaticamente manutenções atrasadas
-- Esta função é chamada automaticamente para marcar manutenções com datas passadas como "atrasado"

-- Primeiro, garantir que existe o status "atrasado"
INSERT INTO maintenance_status (name, color, description, is_active)
VALUES ('Atrasado', '#ef4444', 'Manutenção com data vencida', true)
ON CONFLICT (name) DO NOTHING;

-- Função para atualizar manutenções atrasadas
CREATE OR REPLACE FUNCTION update_overdue_maintenances()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_status_id UUID;
    updated_count INTEGER := 0;
BEGIN
    -- Buscar o ID do status "Atrasado"
    SELECT id INTO overdue_status_id 
    FROM maintenance_status 
    WHERE LOWER(name) LIKE '%atrasad%'
    LIMIT 1;
    
    -- Se não encontrar o status, criar
    IF overdue_status_id IS NULL THEN
        INSERT INTO maintenance_status (name, color, description, is_active)
        VALUES ('Atrasado', '#ef4444', 'Manutenção com data vencida', true)
        RETURNING id INTO overdue_status_id;
    END IF;
    
    -- Atualizar manutenções atrasadas
    -- Condições:
    -- 1. scheduled_date < hoje
    -- 2. Não está como "atrasado"
    -- 3. Não está concluída/completa/finalizada
    UPDATE maintenances 
    SET 
        status_id = overdue_status_id,
        status = 'atrasado',
        updated_at = NOW()
    WHERE 
        scheduled_date < CURRENT_DATE
        AND status_id != overdue_status_id
        AND LOWER(COALESCE(status, '')) NOT LIKE '%conclu%'
        AND LOWER(COALESCE(status, '')) NOT LIKE '%complet%'
        AND LOWER(COALESCE(status, '')) NOT LIKE '%finaliz%'
        AND status_id NOT IN (
            SELECT id FROM maintenance_status 
            WHERE LOWER(name) LIKE '%conclu%' 
               OR LOWER(name) LIKE '%complet%'
               OR LOWER(name) LIKE '%finaliz%'
        );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log da operação
    RAISE NOTICE 'Atualizadas % manutenções para status atrasado', updated_count;
    
    RETURN updated_count;
END;
$$;

-- Função que será chamada por trigger em mudanças nas manutenções
CREATE OR REPLACE FUNCTION check_maintenance_overdue_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_status_id UUID;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Buscar o ID do status "Atrasado"
    SELECT id INTO overdue_status_id 
    FROM maintenance_status 
    WHERE LOWER(name) LIKE '%atrasad%'
    LIMIT 1;
    
    -- Se o registro novo/atualizado tem data passada e não está completo
    IF NEW.scheduled_date < today_date 
       AND LOWER(COALESCE(NEW.status, '')) NOT LIKE '%conclu%'
       AND LOWER(COALESCE(NEW.status, '')) NOT LIKE '%complet%'
       AND LOWER(COALESCE(NEW.status, '')) NOT LIKE '%finaliz%'
       AND NEW.status_id != overdue_status_id THEN
        
        NEW.status_id = overdue_status_id;
        NEW.status = 'atrasado';
        NEW.updated_at = NOW();
        
        RAISE NOTICE 'Manutenção % marcada como atrasada automaticamente', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para verificar automaticamente quando manutenções são inseridas ou atualizadas
DROP TRIGGER IF EXISTS maintenance_overdue_check_trigger ON maintenances;
CREATE TRIGGER maintenance_overdue_check_trigger
    BEFORE INSERT OR UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION check_maintenance_overdue_on_change();

-- Função para executar limpeza diária (pode ser chamada por cron job)
CREATE OR REPLACE FUNCTION daily_maintenance_status_sync()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM update_overdue_maintenances();
    
    -- Log da execução diária
    INSERT INTO system_logs (operation, details, created_at)
    VALUES (
        'daily_maintenance_sync', 
        'Sincronização automática de status de manutenções executada',
        NOW()
    ) ON CONFLICT DO NOTHING; -- Ignora se a tabela não existir
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log de erro sem falhar
        RAISE NOTICE 'Erro na sincronização diária: %', SQLERRM;
END;
$$;

-- Executar uma vez para atualizar manutenções já existentes
SELECT update_overdue_maintenances();

-- Comentários da migração
COMMENT ON FUNCTION update_overdue_maintenances() IS 'Atualiza automaticamente manutenções com datas passadas para status "atrasado"';
COMMENT ON FUNCTION check_maintenance_overdue_on_change() IS 'Trigger function que verifica se uma manutenção deve ser marcada como atrasada';
COMMENT ON FUNCTION daily_maintenance_status_sync() IS 'Função para execução diária de sincronização de status';