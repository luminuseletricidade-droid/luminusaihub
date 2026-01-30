-- Corrigir tabela de checklists - tornar maintenance_id opcional para templates
ALTER TABLE public.maintenance_checklists 
ALTER COLUMN maintenance_id DROP NOT NULL;

-- Executar função para calcular alertas
SELECT public.calculate_maintenance_alerts();