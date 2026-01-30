-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/fuepergwtyxhxtubxxux/sql/new

-- 1. Remover todas as políticas existentes
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

DROP POLICY IF EXISTS "Allow authenticated uploads to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from contract-documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated uploads to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from client-documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated uploads to maintenance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from maintenance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to maintenance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from maintenance-documents" ON storage.objects;

-- 2. Criar políticas simplificadas que funcionam
-- Contract Documents
CREATE POLICY "contract_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "contract_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "contract_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "contract_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents
CREATE POLICY "client_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "client_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "client_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "client_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents
CREATE POLICY "maintenance_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

CREATE POLICY "maintenance_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "maintenance_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "maintenance_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');
