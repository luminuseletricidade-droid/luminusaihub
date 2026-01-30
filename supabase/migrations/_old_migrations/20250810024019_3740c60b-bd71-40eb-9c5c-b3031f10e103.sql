-- 1) Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('contract-documents','client-documents','maintenance-documents');

-- 2) Restrictive RLS for maintenance_checklists and maintenance_checklist_items
-- Drop permissive policies if they exist
DROP POLICY IF EXISTS "Enable all for maintenance_checklists" ON public.maintenance_checklists;
DROP POLICY IF EXISTS "Enable all for maintenance_checklist_items" ON public.maintenance_checklist_items;

-- Ensure RLS is enabled
ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_checklists
CREATE POLICY "Users can view their maintenance_checklists"
ON public.maintenance_checklists
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    (maintenance_id IS NULL AND is_template = true) OR
    EXISTS (
      SELECT 1 FROM public.maintenances m
      LEFT JOIN public.contracts c ON c.id = m.contract_id
      WHERE m.id = maintenance_checklists.maintenance_id
        AND (m.user_id = auth.uid() OR c.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can insert their maintenance_checklists"
ON public.maintenance_checklists
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    (maintenance_id IS NULL AND is_template = true) OR
    EXISTS (
      SELECT 1 FROM public.maintenances m
      LEFT JOIN public.contracts c ON c.id = m.contract_id
      WHERE m.id = maintenance_checklists.maintenance_id
        AND (m.user_id = auth.uid() OR c.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update their maintenance_checklists"
ON public.maintenance_checklists
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    (maintenance_id IS NULL AND is_template = true) OR
    EXISTS (
      SELECT 1 FROM public.maintenances m
      LEFT JOIN public.contracts c ON c.id = m.contract_id
      WHERE m.id = maintenance_checklists.maintenance_id
        AND (m.user_id = auth.uid() OR c.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete their maintenance_checklists"
ON public.maintenance_checklists
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    (maintenance_id IS NULL AND is_template = true) OR
    EXISTS (
      SELECT 1 FROM public.maintenances m
      LEFT JOIN public.contracts c ON c.id = m.contract_id
      WHERE m.id = maintenance_checklists.maintenance_id
        AND (m.user_id = auth.uid() OR c.user_id = auth.uid())
    )
  )
);

-- Policies for maintenance_checklist_items
CREATE POLICY "Users can view their maintenance_checklist_items"
ON public.maintenance_checklist_items
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_checklists cl
    LEFT JOIN public.maintenances m ON m.id = cl.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE cl.id = maintenance_checklist_items.checklist_id
      AND (
        (cl.maintenance_id IS NULL AND cl.is_template = true) OR
        (m.user_id = auth.uid() OR c.user_id = auth.uid())
      )
  )
);

CREATE POLICY "Users can insert their maintenance_checklist_items"
ON public.maintenance_checklist_items
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_checklists cl
    LEFT JOIN public.maintenances m ON m.id = cl.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE cl.id = maintenance_checklist_items.checklist_id
      AND (
        (cl.maintenance_id IS NULL AND cl.is_template = true) OR
        (m.user_id = auth.uid() OR c.user_id = auth.uid())
      )
  )
);

CREATE POLICY "Users can update their maintenance_checklist_items"
ON public.maintenance_checklist_items
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_checklists cl
    LEFT JOIN public.maintenances m ON m.id = cl.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE cl.id = maintenance_checklist_items.checklist_id
      AND (
        (cl.maintenance_id IS NULL AND cl.is_template = true) OR
        (m.user_id = auth.uid() OR c.user_id = auth.uid())
      )
  )
);

CREATE POLICY "Users can delete their maintenance_checklist_items"
ON public.maintenance_checklist_items
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_checklists cl
    LEFT JOIN public.maintenances m ON m.id = cl.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE cl.id = maintenance_checklist_items.checklist_id
      AND (
        (cl.maintenance_id IS NULL AND cl.is_template = true) OR
        (m.user_id = auth.uid() OR c.user_id = auth.uid())
      )
  )
);

-- 3) Storage policies for private buckets
-- CONTRACT DOCUMENTS
CREATE POLICY "Users can read their contract documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.contract_documents cd
      JOIN public.contracts c ON c.id = cd.contract_id
      WHERE cd.file_path = name AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.contract_documents cd
      WHERE cd.file_path = name AND cd.uploaded_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload contract documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their contract documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contract_documents cd
    JOIN public.contracts c ON c.id = cd.contract_id
    WHERE cd.file_path = name AND (c.user_id = auth.uid() OR cd.uploaded_by = auth.uid())
  )
);

CREATE POLICY "Users can delete their contract documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contract_documents cd
    JOIN public.contracts c ON c.id = cd.contract_id
    WHERE cd.file_path = name AND (c.user_id = auth.uid() OR cd.uploaded_by = auth.uid())
  )
);

-- CLIENT DOCUMENTS
CREATE POLICY "Users can read their client documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-documents' AND auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.client_documents cd
      JOIN public.clients cl ON cl.id = cd.client_id
      WHERE cd.file_path = name AND cl.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_documents cd
      WHERE cd.file_path = name AND cd.uploaded_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload client documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their client documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.client_documents cd
    JOIN public.clients cl ON cl.id = cd.client_id
    WHERE cd.file_path = name AND (cl.user_id = auth.uid() OR cd.uploaded_by = auth.uid())
  )
);

CREATE POLICY "Users can delete their client documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.client_documents cd
    JOIN public.clients cl ON cl.id = cd.client_id
    WHERE cd.file_path = name AND (cl.user_id = auth.uid() OR cd.uploaded_by = auth.uid())
  )
);

-- MAINTENANCE DOCUMENTS
CREATE POLICY "Users can read their maintenance documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'maintenance-documents' AND auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.maintenance_documents md
      JOIN public.maintenances m ON m.id = md.maintenance_id
      LEFT JOIN public.contracts c ON c.id = m.contract_id
      WHERE md.file_path = name AND (m.user_id = auth.uid() OR c.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.maintenance_documents md
      WHERE md.file_path = name AND md.uploaded_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload maintenance documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'maintenance-documents' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their maintenance documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'maintenance-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_documents md
    JOIN public.maintenances m ON m.id = md.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE md.file_path = name AND (m.user_id = auth.uid() OR c.user_id = auth.uid() OR md.uploaded_by = auth.uid())
  )
);

CREATE POLICY "Users can delete their maintenance documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'maintenance-documents' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.maintenance_documents md
    JOIN public.maintenances m ON m.id = md.maintenance_id
    LEFT JOIN public.contracts c ON c.id = m.contract_id
    WHERE md.file_path = name AND (m.user_id = auth.uid() OR c.user_id = auth.uid() OR md.uploaded_by = auth.uid())
  )
);
