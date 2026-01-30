-- ============================================
-- EXECUTAR NO SQL EDITOR DO SUPABASE DASHBOARD
-- ============================================
-- Corrigir RLS do bucket client-documents para permitir uploads

-- 1. Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%client%'
ORDER BY policyname;

-- 2. Remover todas as políticas antigas relacionadas a client-documents
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

-- 3. Criar políticas permissivas para client-documents

-- Permitir INSERT (upload)
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- Permitir SELECT (visualização)
CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

-- Permitir UPDATE (atualização)
CREATE POLICY "Authenticated users can update client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- Permitir DELETE (exclusão)
CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- 4. Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%client%'
ORDER BY policyname;
