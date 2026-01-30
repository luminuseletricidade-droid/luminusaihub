-- Reestruturação da Arquitetura do Banco de Dados Luminos
-- Este migration implementa a centralização de dados nos contratos

-- 1. Primeiro, adicionar foreign keys ausentes com ON DELETE CASCADE

-- Adicionar foreign key entre contracts e clients
ALTER TABLE contracts 
ADD CONSTRAINT fk_contracts_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Adicionar foreign key entre equipment e contracts
ALTER TABLE equipment 
ADD CONSTRAINT fk_equipment_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Adicionar foreign key entre maintenances e contracts
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Adicionar foreign key entre maintenances e equipment
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_equipment_id 
FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;

-- Adicionar foreign key entre contract_documents e contracts
ALTER TABLE contract_documents 
ADD CONSTRAINT fk_contract_documents_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Adicionar foreign key entre maintenance_documents e maintenances
ALTER TABLE maintenance_documents 
ADD CONSTRAINT fk_maintenance_documents_maintenance_id 
FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE;

-- Adicionar foreign key entre maintenance_checklists e maintenances
ALTER TABLE maintenance_checklists 
ADD CONSTRAINT fk_maintenance_checklists_maintenance_id 
FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE;

-- Adicionar foreign key entre maintenance_checklist_items e maintenance_checklists
ALTER TABLE maintenance_checklist_items 
ADD CONSTRAINT fk_maintenance_checklist_items_checklist_id 
FOREIGN KEY (checklist_id) REFERENCES maintenance_checklists(id) ON DELETE CASCADE;

-- 2. Corrigir o tipo de contract_id na tabela ai_generated_plans
ALTER TABLE ai_generated_plans 
ALTER COLUMN contract_id TYPE uuid USING contract_id::uuid;

-- Adicionar foreign key entre ai_generated_plans e contracts
ALTER TABLE ai_generated_plans 
ADD CONSTRAINT fk_ai_generated_plans_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- 3. Adicionar foreign key entre clients e client_status
ALTER TABLE clients 
ADD CONSTRAINT fk_clients_status_id 
FOREIGN KEY (status_id) REFERENCES client_status(id) ON DELETE SET NULL;

-- Adicionar foreign key entre maintenances e maintenance_status
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_status_id 
FOREIGN KEY (status_id) REFERENCES maintenance_status(id) ON DELETE SET NULL;

-- 4. Configurar realtime para todas as tabelas principais
ALTER TABLE contracts REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE maintenances REPLICA IDENTITY FULL;
ALTER TABLE equipment REPLICA IDENTITY FULL;
ALTER TABLE contract_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_documents REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklists REPLICA IDENTITY FULL;
ALTER TABLE maintenance_checklist_items REPLICA IDENTITY FULL;
ALTER TABLE ai_generated_plans REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenances;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_plans;

-- 5. Criar view para maintenances com dados combinados (substitui dados redundantes)
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

-- 6. Criar função para limpar dados órfãos
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
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para atualizar timestamps automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_contracts_updated_at 
    BEFORE UPDATE ON contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenances_updated_at 
    BEFORE UPDATE ON maintenances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at 
    BEFORE UPDATE ON equipment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Executar limpeza inicial
SELECT clean_orphaned_data();