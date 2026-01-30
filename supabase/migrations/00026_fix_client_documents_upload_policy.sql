-- Adicionar política de INSERT para permitir upload no bucket client-documents
-- Migration: 00026_fix_client_documents_upload_policy.sql

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;

-- Criar política de INSERT para client-documents
CREATE POLICY "Users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');
