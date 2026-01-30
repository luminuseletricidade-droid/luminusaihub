-- Fix SQL error and complete anonymous access policy fixes

-- Update policies using correct column names
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, polname as policyname
        FROM pg_policy 
        WHERE schemaname = 'public' 
        AND 'public' = ANY(roles)
    LOOP
        EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Specifically update remaining policies that still allow anonymous access
ALTER POLICY "Users can delete their own clients" ON public.clients TO authenticated;
ALTER POLICY "Users can insert their own clients" ON public.clients TO authenticated;
ALTER POLICY "Users can update their own clients" ON public.clients TO authenticated;
ALTER POLICY "Users can view their own clients" ON public.clients TO authenticated;

ALTER POLICY "Users can create contract documents" ON public.contract_documents TO authenticated;
ALTER POLICY "Users can delete contract documents" ON public.contract_documents TO authenticated;
ALTER POLICY "Users can update contract documents" ON public.contract_documents TO authenticated;
ALTER POLICY "Users can view their contract documents" ON public.contract_documents TO authenticated;

ALTER POLICY "Users can delete their own contracts" ON public.contracts TO authenticated;
ALTER POLICY "Users can insert their own contracts" ON public.contracts TO authenticated;
ALTER POLICY "Users can update their own contracts" ON public.contracts TO authenticated;
ALTER POLICY "Users can view their own contracts" ON public.contracts TO authenticated;

ALTER POLICY "Users can delete equipment" ON public.equipment TO authenticated;
ALTER POLICY "Users can insert equipment" ON public.equipment TO authenticated;
ALTER POLICY "Users can update equipment" ON public.equipment TO authenticated;
ALTER POLICY "Users can view their equipment" ON public.equipment TO authenticated;

ALTER POLICY "Users can delete maintenances" ON public.maintenances TO authenticated;
ALTER POLICY "Users can insert maintenances" ON public.maintenances TO authenticated;
ALTER POLICY "Users can update maintenances" ON public.maintenances TO authenticated;
ALTER POLICY "Users can view their maintenances" ON public.maintenances TO authenticated;

-- Update remaining policies for other tables
ALTER POLICY "All users can view client status" ON public.client_status TO authenticated;
ALTER POLICY "Only admins can manage client status" ON public.client_status TO authenticated;

ALTER POLICY "All users can view maintenance status" ON public.maintenance_status TO authenticated;
ALTER POLICY "Only admins can manage maintenance status" ON public.maintenance_status TO authenticated;

-- Update client_documents, maintenance_documents policies
ALTER POLICY "Users can view client documents for their clients" ON public.client_documents TO authenticated;
ALTER POLICY "Users can create client documents for their clients" ON public.client_documents TO authenticated;
ALTER POLICY "Users can update client documents for their clients" ON public.client_documents TO authenticated;
ALTER POLICY "Users can delete client documents for their clients" ON public.client_documents TO authenticated;

ALTER POLICY "Users can view maintenance documents for their maintenances" ON public.maintenance_documents TO authenticated;
ALTER POLICY "Users can create maintenance documents for their maintenances" ON public.maintenance_documents TO authenticated;
ALTER POLICY "Users can update maintenance documents for their maintenances" ON public.maintenance_documents TO authenticated;
ALTER POLICY "Users can delete maintenance documents for their maintenances" ON public.maintenance_documents TO authenticated;

-- Update ai_predictions policies
ALTER POLICY "Users can view ai predictions for their contracts" ON public.ai_predictions TO authenticated;
ALTER POLICY "Users can create ai predictions for their contracts" ON public.ai_predictions TO authenticated;
ALTER POLICY "Users can update ai predictions for their contracts" ON public.ai_predictions TO authenticated;
ALTER POLICY "Users can delete ai predictions for their contracts" ON public.ai_predictions TO authenticated;