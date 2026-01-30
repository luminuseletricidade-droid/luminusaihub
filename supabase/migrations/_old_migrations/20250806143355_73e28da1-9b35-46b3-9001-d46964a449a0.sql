-- Fix anonymous access policies by requiring authentication

-- Update all policies to require authenticated users only
-- This addresses the anonymous access warnings from the security linter

-- Fix ai_generated_plans policies
DROP POLICY IF EXISTS "Users can create their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can view their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can update their own ai_generated_plans" ON public.ai_generated_plans;
DROP POLICY IF EXISTS "Users can delete their own ai_generated_plans" ON public.ai_generated_plans;

CREATE POLICY "Users can create their own ai_generated_plans" 
ON public.ai_generated_plans 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ai_generated_plans" 
ON public.ai_generated_plans 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_generated_plans" 
ON public.ai_generated_plans 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai_generated_plans" 
ON public.ai_generated_plans 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix chat_messages policies
DROP POLICY IF EXISTS "Users can create their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;

CREATE POLICY "Users can create their own chat messages" 
ON public.chat_messages 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chat messages" 
ON public.chat_messages 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" 
ON public.chat_messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" 
ON public.chat_messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix chat_sessions policies
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
ON public.chat_sessions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix contract_services policies
DROP POLICY IF EXISTS "Users can insert their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can view their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can update their own contract services" ON public.contract_services;
DROP POLICY IF EXISTS "Users can delete their own contract services" ON public.contract_services;

CREATE POLICY "Users can insert their own contract services" 
ON public.contract_services 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contract services" 
ON public.contract_services 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contract services" 
ON public.contract_services 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contract services" 
ON public.contract_services 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix generated_reports policies
DROP POLICY IF EXISTS "Users can create their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can view their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can update their own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users can delete their own generated reports" ON public.generated_reports;

CREATE POLICY "Users can create their own generated reports" 
ON public.generated_reports 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own generated reports" 
ON public.generated_reports 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated reports" 
ON public.generated_reports 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated reports" 
ON public.generated_reports 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Update other policies to use TO authenticated
UPDATE pg_policy 
SET roles = ARRAY['authenticated'] 
WHERE policyname LIKE '%can%' 
AND schemaname = 'public' 
AND roles = ARRAY['public'];

-- Fix maintenance checklist policies to be user-scoped instead of 'true'
DROP POLICY IF EXISTS "Enable all for maintenance_checklist_items" ON public.maintenance_checklist_items;
DROP POLICY IF EXISTS "Enable all for maintenance_checklists" ON public.maintenance_checklists;

CREATE POLICY "Users can manage checklist items for their maintenances" 
ON public.maintenance_checklist_items 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_checklists mc
    JOIN public.maintenances m ON mc.maintenance_id = m.id
    WHERE mc.id = maintenance_checklist_items.checklist_id 
    AND (m.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.contracts c 
      WHERE c.id = m.contract_id AND c.user_id = auth.uid()
    ))
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can manage checklists for their maintenances" 
ON public.maintenance_checklists 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maintenances m
    WHERE m.id = maintenance_checklists.maintenance_id 
    AND (m.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.contracts c 
      WHERE c.id = m.contract_id AND c.user_id = auth.uid()
    ))
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Update all remaining policies to require authentication
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policy 
        WHERE schemaname = 'public' 
        AND 'public' = ANY(roles)
    LOOP
        EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;