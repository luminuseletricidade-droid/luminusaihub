-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para permitir uploads
-- Execute no SQL Editor: https://supabase.com/dashboard/project/fuepergwtyxhxtubxxux/sql/new

-- Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'contract-documents';

-- Tornar o bucket público (temporariamente para testar)
UPDATE storage.buckets
SET public = true
WHERE id = 'contract-documents';

-- OU criar política mais permissiva
DROP POLICY IF EXISTS "contract_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "contract_documents_delete" ON storage.objects;

-- Políticas mais permissivas (permitem qualquer usuário autenticado)
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');
