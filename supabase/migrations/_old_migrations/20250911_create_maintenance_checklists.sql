-- Create maintenance checklist templates table
CREATE TABLE IF NOT EXISTS maintenance_checklist_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  maintenance_type VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id)
);

-- Create maintenance checklists table
CREATE TABLE IF NOT EXISTS maintenance_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  template_id UUID REFERENCES maintenance_checklist_templates(id),
  items JSONB NOT NULL DEFAULT '[]',
  completed_items JSONB NOT NULL DEFAULT '[]',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_maintenance_checklists_maintenance_id ON maintenance_checklists(maintenance_id);
CREATE INDEX idx_maintenance_checklist_templates_user_id ON maintenance_checklist_templates(user_id);
CREATE INDEX idx_maintenance_checklist_templates_type ON maintenance_checklist_templates(maintenance_type);

-- Create default checklist templates
INSERT INTO maintenance_checklist_templates (name, description, maintenance_type, is_default, items) VALUES
('Checklist Padrão - Preventiva', 'Checklist padrão para manutenção preventiva', 'Preventiva', true, 
  '[
    {"id": "1", "text": "Ferramentas preparadas", "required": true},
    {"id": "2", "text": "Equipamentos de segurança verificados", "required": true},
    {"id": "3", "text": "Status do equipamento verificado", "required": true},
    {"id": "4", "text": "Manutenção executada conforme procedimento", "required": true},
    {"id": "5", "text": "Testes de funcionamento realizados", "required": true},
    {"id": "6", "text": "Limpeza e organização do local", "required": false},
    {"id": "7", "text": "Documentação atualizada", "required": false}
  ]'::jsonb),
('Checklist Padrão - Corretiva', 'Checklist padrão para manutenção corretiva', 'Corretiva', true,
  '[
    {"id": "1", "text": "Diagnóstico do problema realizado", "required": true},
    {"id": "2", "text": "Peças de reposição disponíveis", "required": true},
    {"id": "3", "text": "Equipamentos de segurança verificados", "required": true},
    {"id": "4", "text": "Reparo executado", "required": true},
    {"id": "5", "text": "Testes de funcionamento realizados", "required": true},
    {"id": "6", "text": "Causa raiz documentada", "required": false},
    {"id": "7", "text": "Recomendações para prevenção", "required": false}
  ]'::jsonb),
('Checklist Padrão - Emergencial', 'Checklist padrão para manutenção emergencial', 'Emergencial', true,
  '[
    {"id": "1", "text": "Segurança da área verificada", "required": true},
    {"id": "2", "text": "Isolamento do equipamento realizado", "required": true},
    {"id": "3", "text": "Diagnóstico rápido executado", "required": true},
    {"id": "4", "text": "Reparo emergencial realizado", "required": true},
    {"id": "5", "text": "Teste básico de funcionamento", "required": true},
    {"id": "6", "text": "Relatório de ocorrência preenchido", "required": true}
  ]'::jsonb),
('Checklist Padrão - Trimestral', 'Checklist padrão para inspeção trimestral', 'Trimestral', true,
  '[
    {"id": "1", "text": "Inspeção visual completa", "required": true},
    {"id": "2", "text": "Verificação de parâmetros operacionais", "required": true},
    {"id": "3", "text": "Teste de dispositivos de segurança", "required": true},
    {"id": "4", "text": "Lubrificação conforme especificação", "required": true},
    {"id": "5", "text": "Limpeza geral do equipamento", "required": false},
    {"id": "6", "text": "Atualização do histórico de manutenção", "required": false}
  ]'::jsonb);

-- RLS Policies
ALTER TABLE maintenance_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_checklists ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_checklist_templates
CREATE POLICY "Users can view default templates and their own templates" ON maintenance_checklist_templates
  FOR SELECT USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON maintenance_checklist_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON maintenance_checklist_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON maintenance_checklist_templates
  FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Policies for maintenance_checklists
CREATE POLICY "Users can view checklists for their maintenances" ON maintenance_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maintenances m
      WHERE m.id = maintenance_checklists.maintenance_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checklists for their maintenances" ON maintenance_checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenances m
      WHERE m.id = maintenance_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklists for their maintenances" ON maintenance_checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM maintenances m
      WHERE m.id = maintenance_checklists.maintenance_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checklists for their maintenances" ON maintenance_checklists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM maintenances m
      WHERE m.id = maintenance_checklists.maintenance_id
      AND m.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_maintenance_checklist_templates_updated_at
  BEFORE UPDATE ON maintenance_checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_checklists_updated_at
  BEFORE UPDATE ON maintenance_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();