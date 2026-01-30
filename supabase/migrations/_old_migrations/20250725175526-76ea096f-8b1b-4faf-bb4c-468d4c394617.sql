-- Reestruturação da Arquitetura - Fase 3 Final: Realtime e Views

-- 1. Configurar realtime (REPLICA IDENTITY) para todas as tabelas principais
ALTER TABLE contracts REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE maintenances REPLICA IDENTITY FULL;
ALTER TABLE equipment REPLICA IDENTITY FULL;
ALTER TABLE contract_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklists REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklist_items REPLICA IDENTITY FULL;
ALTER TABLE ai_generated_plans REPLICA IDENTITY FULL;

-- 2. Adicionar apenas as tabelas que ainda não estão na publicação realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_documents;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklists;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklist_items;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_plans;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- 3. Criar view para maintenances com dados combinados (sem conflito de nomes)
CREATE OR REPLACE VIEW maintenances_with_details AS
SELECT 
    m.id,
    m.type,
    m.description,
    m.status,
    m.priority,
    m.scheduled_date,
    m.scheduled_time,
    m.completed_date,
    m.estimated_duration,
    m.technician,
    m.notes,
    m.alert_level,
    m.alert_message,
    m.color_type,
    m.color_status,
    m.frequency,
    m.contract_id,
    m.equipment_id,
    m.status_id,
    m.created_at,
    m.updated_at,
    -- Dados relacionados com aliases únicos
    c.contract_number,
    cl.name as contract_client_name,
    e.type as equipment_type,
    e.model as equipment_model,
    ms.name as status_name,
    ms.color as status_color
FROM maintenances m
LEFT JOIN contracts c ON m.contract_id = c.id
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN equipment e ON m.equipment_id = e.id
LEFT JOIN maintenance_status ms ON m.status_id = ms.id;

-- 4. Criar função para limpar dados órfãos
CREATE OR REPLACE FUNCTION clean_orphaned_data()
RETURNS void AS $$
BEGIN
    DELETE FROM equipment WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM maintenances WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM contract_documents WHERE contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM ai_generated_plans WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    RAISE NOTICE 'Limpeza de dados órfãos concluída';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Executar limpeza inicial
SELECT clean_orphaned_data();