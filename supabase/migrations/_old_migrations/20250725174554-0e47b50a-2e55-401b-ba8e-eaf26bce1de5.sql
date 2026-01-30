-- Reestruturação da Arquitetura - Fase 2: Foreign Keys e Constraints

-- 1. Adicionar foreign keys com ON DELETE CASCADE

-- Foreign key entre equipment e contracts
ALTER TABLE equipment 
ADD CONSTRAINT fk_equipment_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Foreign key entre maintenances e contracts
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Foreign key entre maintenances e equipment
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_equipment_id 
FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;

-- Foreign key entre contract_documents e contracts
ALTER TABLE contract_documents 
ADD CONSTRAINT fk_contract_documents_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Foreign key entre maintenance_documents e maintenances
ALTER TABLE maintenance_documents 
ADD CONSTRAINT fk_maintenance_documents_maintenance_id 
FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE;

-- Foreign key entre maintenance_checklists e maintenances
ALTER TABLE maintenance_checklists 
ADD CONSTRAINT fk_maintenance_checklists_maintenance_id 
FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE;

-- Foreign key entre maintenance_checklist_items e maintenance_checklists
ALTER TABLE maintenance_checklist_items 
ADD CONSTRAINT fk_maintenance_checklist_items_checklist_id 
FOREIGN KEY (checklist_id) REFERENCES maintenance_checklists(id) ON DELETE CASCADE;

-- Foreign key entre ai_generated_plans e contracts
ALTER TABLE ai_generated_plans 
ADD CONSTRAINT fk_ai_generated_plans_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Foreign key entre contracts e clients
ALTER TABLE contracts 
ADD CONSTRAINT fk_contracts_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Foreign key entre clients e client_status
ALTER TABLE clients 
ADD CONSTRAINT fk_clients_status_id 
FOREIGN KEY (status_id) REFERENCES client_status(id) ON DELETE SET NULL;

-- Foreign key entre maintenances e maintenance_status
ALTER TABLE maintenances 
ADD CONSTRAINT fk_maintenances_status_id 
FOREIGN KEY (status_id) REFERENCES maintenance_status(id) ON DELETE SET NULL;