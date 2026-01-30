-- Reestruturação da Arquitetura - Fase 3: Realtime e Views

-- 1. Configurar realtime para todas as tabelas principais
ALTER TABLE contracts REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE maintenances REPLICA IDENTITY FULL;
ALTER TABLE equipment REPLICA IDENTITY FULL;
ALTER TABLE contract_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklists REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklist_items REPLICA IDENTITY FULL;
ALTER TABLE ai_generated_plans REPLICA IDENTITY FULL;

-- 2. Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenances;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_plans;

-- 3. Criar view para maintenances com dados combinados
CREATE OR REPLACE VIEW maintenances_with_details AS
SELECT 
    m.*,
    c.contract_number,
    cl.name as client_name,
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
    -- Limpar equipamentos sem contrato
    DELETE FROM equipment WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    
    -- Limpar manutenções sem contrato
    DELETE FROM maintenances WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    
    -- Limpar documentos de contrato órfãos
    DELETE FROM contract_documents WHERE contract_id NOT IN (SELECT id FROM contracts);
    
    -- Limpar planos de IA órfãos
    DELETE FROM ai_generated_plans WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    
    RAISE NOTICE 'Limpeza de dados órfãos concluída';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Executar limpeza inicial
SELECT clean_orphaned_data();