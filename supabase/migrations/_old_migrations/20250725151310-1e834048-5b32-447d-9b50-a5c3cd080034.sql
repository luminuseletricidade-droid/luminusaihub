-- Criar tabela para checklists de manutenção
CREATE TABLE public.maintenance_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT DEFAULT 'custom',
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para itens do checklist
CREATE TABLE public.maintenance_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT DEFAULT 'checkbox', -- checkbox, text, photo
  is_completed BOOLEAN DEFAULT false,
  value TEXT,
  photo_urls TEXT[],
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar colunas para cores e alertas na tabela maintenances
ALTER TABLE public.maintenances 
ADD COLUMN IF NOT EXISTS color_status TEXT DEFAULT '#6b7280',
ADD COLUMN IF NOT EXISTS color_type TEXT DEFAULT '#6b7280',
ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'none', -- none, warning, urgent, critical
ADD COLUMN IF NOT EXISTS alert_message TEXT,
ADD COLUMN IF NOT EXISTS last_alert_sent TIMESTAMP WITH TIME ZONE;

-- Adicionar colunas para melhor tracking
ALTER TABLE public.maintenances
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS contract_number TEXT,
ADD COLUMN IF NOT EXISTS equipment_info JSONB DEFAULT '{}';

-- Enable RLS para as novas tabelas
ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para checklists
CREATE POLICY "Users can view maintenance checklists" 
ON public.maintenance_checklists 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create maintenance checklists" 
ON public.maintenance_checklists 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update maintenance checklists" 
ON public.maintenance_checklists 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete maintenance checklists" 
ON public.maintenance_checklists 
FOR DELETE 
USING (true);

-- Políticas RLS para itens do checklist
CREATE POLICY "Users can view checklist items" 
ON public.maintenance_checklist_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create checklist items" 
ON public.maintenance_checklist_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update checklist items" 
ON public.maintenance_checklist_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete checklist items" 
ON public.maintenance_checklist_items 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_checklists_updated_at
BEFORE UPDATE ON public.maintenance_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.maintenance_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular alertas de manutenção
CREATE OR REPLACE FUNCTION public.calculate_maintenance_alerts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualizar alertas baseado na data agendada
  UPDATE public.maintenances 
  SET 
    alert_level = CASE 
      WHEN scheduled_date < CURRENT_DATE THEN 'critical'
      WHEN scheduled_date = CURRENT_DATE THEN 'urgent' 
      WHEN scheduled_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'warning'
      ELSE 'none'
    END,
    alert_message = CASE 
      WHEN scheduled_date < CURRENT_DATE THEN 'Manutenção em atraso!'
      WHEN scheduled_date = CURRENT_DATE THEN 'Manutenção agendada para hoje'
      WHEN scheduled_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Manutenção se aproximando'
      ELSE NULL
    END,
    color_status = CASE 
      WHEN status = 'scheduled' THEN '#3b82f6'
      WHEN status = 'in_progress' THEN '#f59e0b'
      WHEN status = 'completed' THEN '#10b981'
      WHEN status = 'cancelled' THEN '#6b7280'
      ELSE '#dc2626'
    END,
    color_type = CASE 
      WHEN type = 'preventiva' THEN '#10b981'
      WHEN type = 'corretiva' THEN '#f59e0b'
      WHEN type = 'emergencial' THEN '#ef4444'
      WHEN type = 'preditiva' THEN '#3b82f6'
      ELSE '#6b7280'
    END
  WHERE scheduled_date IS NOT NULL;
END;
$$;

-- Trigger para sincronização com contratos
CREATE OR REPLACE FUNCTION public.sync_maintenance_with_contract()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contract_data RECORD;
  client_data RECORD;
BEGIN
  -- Buscar dados do contrato
  IF NEW.contract_id IS NOT NULL THEN
    SELECT * INTO contract_data FROM public.contracts WHERE id = NEW.contract_id::uuid;
    
    IF FOUND THEN
      -- Buscar dados do cliente
      SELECT * INTO client_data FROM public.clients WHERE id = contract_data.client_id;
      
      -- Atualizar campos da manutenção
      NEW.client_name := client_data.name;
      NEW.contract_number := contract_data.contract_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_maintenance_contract_data
BEFORE INSERT OR UPDATE ON public.maintenances
FOR EACH ROW
EXECUTE FUNCTION public.sync_maintenance_with_contract();

-- Inserir templates padrão de checklist
INSERT INTO public.maintenance_checklists (name, description, template_type, is_template) VALUES
('Checklist Preventiva Gerador', 'Template padrão para manutenção preventiva de geradores', 'preventiva', true),
('Checklist Corretiva', 'Template padrão para manutenção corretiva', 'corretiva', true),
('Checklist Emergencial', 'Template padrão para manutenção emergencial', 'emergencial', true);

-- Inserir itens padrão para template preventiva
INSERT INTO public.maintenance_checklist_items (checklist_id, title, description, item_type, order_index, is_required)
SELECT 
  cl.id,
  item.title,
  item.description,
  item.item_type,
  item.order_index,
  item.is_required
FROM public.maintenance_checklists cl,
(VALUES 
  ('Verificar nível de óleo', 'Verificar e completar nível de óleo do motor', 'checkbox', 1, true),
  ('Verificar nível de combustível', 'Verificar nível de combustível no tanque', 'checkbox', 2, true),
  ('Testar partida automática', 'Testar sistema de partida automática', 'checkbox', 3, true),
  ('Verificar voltagem', 'Medir voltagem de saída', 'text', 4, true),
  ('Registro fotográfico', 'Tirar fotos do estado geral do equipamento', 'photo', 5, false),
  ('Observações gerais', 'Anotações importantes sobre a manutenção', 'text', 6, false)
) AS item(title, description, item_type, order_index, is_required)
WHERE cl.template_type = 'preventiva' AND cl.is_template = true;