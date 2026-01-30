-- Corrigir a função de geração de manutenções para calcular frequências corretas
CREATE OR REPLACE FUNCTION public.generate_maintenances_from_services()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  contract_record RECORD;
  maintenance_date DATE;
  sequence_num INTEGER := 1;
  parent_maintenance_id UUID;
  max_iterations INTEGER := 100;
BEGIN
  -- Buscar dados do contrato
  SELECT * INTO contract_record FROM public.contracts WHERE id = NEW.contract_id;
  
  IF contract_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Gerar UUID para agrupar manutenções recorrentes
  parent_maintenance_id := gen_random_uuid();
  
  -- Data inicial da primeira manutenção
  maintenance_date := COALESCE(contract_record.start_date::DATE, CURRENT_DATE);
  
  -- Gerar manutenções para o período do contrato
  WHILE maintenance_date <= COALESCE(contract_record.end_date::DATE, (CURRENT_DATE + INTERVAL '1 year')::DATE) 
    AND sequence_num <= max_iterations LOOP
    
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
    
    -- Calcular próxima data baseada na frequência
    maintenance_date := CASE NEW.frequency
      WHEN 'diaria' THEN maintenance_date + INTERVAL '1 day'
      WHEN 'semanal' THEN maintenance_date + INTERVAL '1 week'
      WHEN 'quinzenal' THEN maintenance_date + INTERVAL '2 weeks'
      WHEN 'mensal' THEN maintenance_date + INTERVAL '1 month'
      WHEN 'bimestral' THEN maintenance_date + INTERVAL '2 months'
      WHEN 'trimestral' THEN maintenance_date + INTERVAL '3 months'
      WHEN 'semestral' THEN maintenance_date + INTERVAL '6 months'
      WHEN 'anual' THEN maintenance_date + INTERVAL '1 year'
      ELSE maintenance_date + INTERVAL '1 month'
    END;
    
    sequence_num := sequence_num + 1;
  END LOOP;
  
  RETURN NEW;
END;
$function$;