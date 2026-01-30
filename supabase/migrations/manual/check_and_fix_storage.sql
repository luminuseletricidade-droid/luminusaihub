-- Verificar bucket e políticas atuais
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'contract-documents';

-- Ver todas as políticas atuais para o bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_delete" ON storage.objects;

-- Tornar o bucket público
UPDATE storage.buckets
SET public = true
WHERE id = 'contract-documents';

-- Criar UMA política simples que permite tudo para o bucket
CREATE POLICY "allow_all_contract_documents"
ON storage.objects
FOR ALL
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');
