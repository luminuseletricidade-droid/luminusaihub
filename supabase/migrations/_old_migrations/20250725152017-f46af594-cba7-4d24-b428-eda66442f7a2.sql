-- Primeiro, vamos adicionar as colunas necessárias na tabela maintenances
ALTER TABLE public.maintenances 
ADD COLUMN IF NOT EXISTS color_status TEXT DEFAULT '#6b7280',
ADD COLUMN IF NOT EXISTS color_type TEXT DEFAULT '#6b7280',
ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS alert_message TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- Criar tabela para checklists de manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID, -- Nullable para templates
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT DEFAULT 'custom',
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para itens do checklist
CREATE TABLE IF NOT EXISTS public.maintenance_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT DEFAULT 'checkbox',
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

-- Enable RLS
ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS simples para checklists
CREATE POLICY "Enable all for maintenance_checklists" ON public.maintenance_checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for maintenance_checklist_items" ON public.maintenance_checklist_items FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_maintenance_checklists_updated_at
BEFORE UPDATE ON public.maintenance_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.maintenance_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();