-- Migration: Fix Storage RLS Policies
-- Description: Remove todas as políticas de storage e recria com permissões corretas
-- Date: 2025-10-02

-- Desabilitar RLS temporariamente para limpar
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes na tabela storage.objects
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
    END LOOP;
END $$;

-- Reabilitar RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para usuários autenticados
-- Contract Documents
CREATE POLICY "Allow authenticated uploads to contract-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated reads from contract-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated updates to contract-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated deletes from contract-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents
CREATE POLICY "Allow authenticated uploads to client-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated reads from client-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated updates to client-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated deletes from client-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents
CREATE POLICY "Allow authenticated uploads to maintenance-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

CREATE POLICY "Allow authenticated reads from maintenance-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "Allow authenticated updates to maintenance-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

CREATE POLICY "Allow authenticated deletes from maintenance-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');
