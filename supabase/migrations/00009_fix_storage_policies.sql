-- Migration: Fix Storage Policies
-- Description: Recria políticas de storage para garantir que funcionem corretamente
-- Date: 2025-10-02

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;

-- Drop new policy names too (if they exist from previous runs)
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance documents" ON storage.objects;

-- Recriar políticas simplificadas (permite acesso a usuários autenticados)
-- Contract Documents
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can view contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can update contract documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
CREATE POLICY "Authenticated users can update client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents
DROP POLICY IF EXISTS "Authenticated users can upload maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload maintenance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can view maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can view maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can update maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can update maintenance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Authenticated users can delete maintenance documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete maintenance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');
