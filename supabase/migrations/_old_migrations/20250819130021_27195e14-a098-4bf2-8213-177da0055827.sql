-- CRITICAL SECURITY FIXES FOR LUMINOS CONTRACT MANAGEMENT SYSTEM
-- Phase 1: Fix Maintenance Checklist RLS Policies

-- Drop the dangerous "Enable all" policies
DROP POLICY IF EXISTS "Enable all for maintenance_checklists" ON public.maintenance_checklists;
DROP POLICY IF EXISTS "Enable all for maintenance_checklist_items" ON public.maintenance_checklist_items;

-- Create secure RLS policies for maintenance_checklists
-- Users can only access checklists for maintenances they own (through contracts)
CREATE POLICY "Users can view their maintenance checklists" 
ON public.maintenance_checklists 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_checklists.maintenance_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can create checklists for their maintenances" 
ON public.maintenance_checklists 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_checklists.maintenance_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their maintenance checklists" 
ON public.maintenance_checklists 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_checklists.maintenance_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their maintenance checklists" 
ON public.maintenance_checklists 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE m.id = maintenance_checklists.maintenance_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create secure RLS policies for maintenance_checklist_items
-- Users can only access checklist items for checklists they own
CREATE POLICY "Users can view their maintenance checklist items" 
ON public.maintenance_checklist_items 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenance_checklists mc
      JOIN public.maintenances m ON mc.maintenance_id = m.id
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE mc.id = maintenance_checklist_items.checklist_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can create items for their maintenance checklists" 
ON public.maintenance_checklist_items 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenance_checklists mc
      JOIN public.maintenances m ON mc.maintenance_id = m.id
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE mc.id = maintenance_checklist_items.checklist_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their maintenance checklist items" 
ON public.maintenance_checklist_items 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenance_checklists mc
      JOIN public.maintenances m ON mc.maintenance_id = m.id
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE mc.id = maintenance_checklist_items.checklist_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their maintenance checklist items" 
ON public.maintenance_checklist_items 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenance_checklists mc
      JOIN public.maintenances m ON mc.maintenance_id = m.id
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE mc.id = maintenance_checklist_items.checklist_id 
      AND c.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Phase 2: Secure Storage Buckets
-- First, update storage buckets to be private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('contract-documents', 'client-documents', 'maintenance-documents');

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "contract-documents is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "client-documents is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "maintenance-documents is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create secure storage policies for contract-documents bucket
CREATE POLICY "Users can view contract documents they own" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'contract-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = c.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can upload to their contract documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'contract-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = c.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their contract documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'contract-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = c.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their contract documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'contract-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.contracts c
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = c.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create secure storage policies for client-documents bucket
CREATE POLICY "Users can view client documents they own" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.clients cl
      WHERE cl.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = cl.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can upload to their client documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.clients cl
      WHERE cl.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = cl.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their client documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.clients cl
      WHERE cl.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = cl.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their client documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.clients cl
      WHERE cl.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = cl.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create secure storage policies for maintenance-documents bucket
CREATE POLICY "Users can view maintenance documents they own" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'maintenance-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = m.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can upload to their maintenance documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'maintenance-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = m.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their maintenance documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'maintenance-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = m.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their maintenance documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'maintenance-documents' 
  AND auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 
      FROM public.maintenances m
      JOIN public.contracts c ON m.contract_id = c.id
      WHERE c.user_id = auth.uid() 
      AND (storage.foldername(name))[1] = m.id::text
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);