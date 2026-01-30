-- Fase 1: Corrigir Functions Search Path (Security Critical)
-- Adicionar search_path às funções existentes para prevenir SQL injection

-- Função 1: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

-- Função 2: get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Função 3: sync_client_from_contract
CREATE OR REPLACE FUNCTION public.sync_client_from_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
BEGIN
  -- Se client_id não existe, criar cliente baseado nos dados do contrato
  IF NEW.client_id IS NULL AND NEW.client_name IS NOT NULL THEN
    INSERT INTO public.clients (
      name, 
      user_id,
      notes,
      created_at,
      updated_at
    ) VALUES (
      NEW.client_name,
      NEW.user_id,
      'Cliente criado automaticamente do contrato ' || NEW.contract_number,
      now(),
      now()
    )
    RETURNING id INTO client_record;
    
    NEW.client_id := client_record.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função 4: sync_equipment_from_contract
CREATE OR REPLACE FUNCTION public.sync_equipment_from_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se não existe equipamento para este contrato, criar um
  IF NOT EXISTS (SELECT 1 FROM public.equipment WHERE contract_id = NEW.id) THEN
    INSERT INTO public.equipment (
      type,
      model,
      location,
      contract_id,
      user_id,
      quantity,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(NEW.equipment_type, 'Gerador'),
      COALESCE(NEW.equipment_model, 'Modelo padrão'),
      COALESCE(NEW.equipment_location, 'Local a definir'),
      NEW.id,
      NEW.user_id,
      1,
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função 5: generate_maintenances_from_services
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

-- Função 6: clean_orphaned_data
CREATE OR REPLACE FUNCTION public.clean_orphaned_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM equipment WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM maintenances WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM contract_documents WHERE contract_id NOT IN (SELECT id FROM contracts);
    DELETE FROM ai_generated_plans WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts);
    RAISE NOTICE 'Limpeza de dados órfãos concluída';
END;
$function$;

-- Função 7: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;