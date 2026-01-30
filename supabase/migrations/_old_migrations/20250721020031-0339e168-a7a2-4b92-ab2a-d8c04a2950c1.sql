
-- Phase 1: Fix Critical RLS Policies
-- First, let's create a proper user authorization model by adding user_id references where needed

-- Update clients table to link to users
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update contracts table to link to users  
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update equipment table to link to users
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update maintenances table to link to users
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update contract_documents table to link to users (if not already present)
ALTER TABLE public.contract_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update ai_generated_plans table created_by to be NOT NULL and add user_id
ALTER TABLE public.ai_generated_plans ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.ai_generated_plans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete contracts" ON public.contracts;

DROP POLICY IF EXISTS "Users can view all equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can delete equipment" ON public.equipment;

DROP POLICY IF EXISTS "Users can view all maintenances" ON public.maintenances;
DROP POLICY IF EXISTS "Users can insert maintenances" ON public.maintenances;
DROP POLICY IF EXISTS "Users can update maintenances" ON public.maintenances;
DROP POLICY IF EXISTS "Users can delete maintenances" ON public.maintenances;

DROP POLICY IF EXISTS "Users can view contract documents" ON public.contract_documents;
DROP POLICY IF EXISTS "Users can create contract documents" ON public.contract_documents;
DROP POLICY IF EXISTS "Users can update contract documents" ON public.contract_documents;
DROP POLICY IF EXISTS "Users can delete contract documents" ON public.contract_documents;

DROP POLICY IF EXISTS "Users can view all ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can insert ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can update ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can delete ai_generated_plans" ON public.ai_generated_plans;

-- Create secure RLS policies that restrict access to user's own data
-- Clients policies
CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Contracts policies
CREATE POLICY "Users can view own contracts" ON public.contracts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contracts" ON public.contracts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Equipment policies
CREATE POLICY "Users can view own equipment" ON public.equipment FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own equipment" ON public.equipment FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own equipment" ON public.equipment FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own equipment" ON public.equipment FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Maintenances policies
CREATE POLICY "Users can view own maintenances" ON public.maintenances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own maintenances" ON public.maintenances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own maintenances" ON public.maintenances FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own maintenances" ON public.maintenances FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Contract documents policies
CREATE POLICY "Users can view own contract documents" ON public.contract_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own contract documents" ON public.contract_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own contract documents" ON public.contract_documents FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contract documents" ON public.contract_documents FOR DELETE TO authenticated USING (user_id = auth.uid());

-- AI generated plans policies
CREATE POLICY "Users can view own ai_generated_plans" ON public.ai_generated_plans FOR SELECT TO authenticated USING (user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can insert own ai_generated_plans" ON public.ai_generated_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND created_by = auth.uid());
CREATE POLICY "Users can update own ai_generated_plans" ON public.ai_generated_plans FOR UPDATE TO authenticated USING (user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can delete own ai_generated_plans" ON public.ai_generated_plans FOR DELETE TO authenticated USING (user_id = auth.uid() OR created_by = auth.uid());

-- Fix the update_updated_at_column function security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create storage policies that are more restrictive
DROP POLICY IF EXISTS "Users can view contract documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update contract documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete contract documents in storage" ON storage.objects;

-- More secure storage policies
CREATE POLICY "Authenticated users can view contract documents in storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can update their contract documents in storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents' AND owner = auth.uid());

CREATE POLICY "Authenticated users can delete their contract documents in storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents' AND owner = auth.uid());
