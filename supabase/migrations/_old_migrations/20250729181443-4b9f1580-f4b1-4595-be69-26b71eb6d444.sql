
-- Adicionar coluna de frequência na tabela contract_services
ALTER TABLE public.contract_services 
ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'mensal';

-- Adicionar trigger para gerar manutenções automaticamente quando um serviço for criado/atualizado
CREATE OR REPLACE FUNCTION public.generate_maintenances_from_services()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  contract_record RECORD;
  maintenance_date DATE;
  sequence_num INTEGER := 1;
  parent_maintenance_id UUID;
  interval_days INTEGER;
BEGIN
  -- Buscar dados do contrato
  SELECT * INTO contract_record FROM public.contracts WHERE id = NEW.contract_id;
  
  IF contract_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determinar intervalo baseado na frequência
  interval_days := CASE NEW.frequency
    WHEN 'diaria' THEN 1
    WHEN 'semanal' THEN 7
    WHEN 'quinzenal' THEN 15
    WHEN 'mensal' THEN 30
    WHEN 'bimestral' THEN 60
    WHEN 'trimestral' THEN 90
    WHEN 'semestral' THEN 180
    WHEN 'anual' THEN 365
    ELSE 30
  END;
  
  -- Gerar UUID para agrupar manutenções recorrentes
  parent_maintenance_id := gen_random_uuid();
  
  -- Gerar manutenções para o período do contrato
  maintenance_date := COALESCE(contract_record.start_date::DATE, CURRENT_DATE);
  
  WHILE maintenance_date <= COALESCE(contract_record.end_date::DATE, (CURRENT_DATE + INTERVAL '1 year')::DATE) LOOP
    INSERT INTO public.maintenances (
      contract_id,
      service_id,
      type,
      scheduled_date,
      scheduled_time,
      status,
      frequency,
      description,
      priority,
      user_id,
      client_name,
      contract_number,
      recurrence_parent_id,
      recurrence_sequence,
      estimated_duration,
      created_at,
      updated_at
    ) VALUES (
      NEW.contract_id,
      NEW.id,
      'preventiva',
      maintenance_date,
      '09:00:00',
      'scheduled',
      NEW.frequency,
      NEW.service_name || ' - Manutenção ' || NEW.frequency,
      'medium',
      NEW.user_id,
      contract_record.client_name,
      contract_record.contract_number,
      parent_maintenance_id,
      sequence_num,
      NEW.duration,
      now(),
      now()
    );
    
    -- Próxima data de manutenção
    maintenance_date := maintenance_date + (interval_days || ' days')::INTERVAL;
    sequence_num := sequence_num + 1;
    
    -- Limitar quantidade de manutenções para evitar loop infinito
    IF sequence_num > 100 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para executar a função
DROP TRIGGER IF EXISTS trigger_generate_maintenances ON public.contract_services;
CREATE TRIGGER trigger_generate_maintenances
  AFTER INSERT OR UPDATE ON public.contract_services
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_maintenances_from_services();
