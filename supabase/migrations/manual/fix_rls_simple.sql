-- ============================================
-- FIX RLS SIMPLES - EXECUTAR NO SUPABASE DASHBOARD
-- Projeto: fuepergwtyxhxtubxxux
-- ============================================

-- PASSO 1: Ver estado atual
SELECT '=== POLÍTICAS ATUAIS ===' as info;
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%client%'
ORDER BY cmd;

-- PASSO 2: Limpar tudo
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'objects' AND policyname LIKE '%client%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- PASSO 3: Criar políticas simples
CREATE POLICY "client_docs_all"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- PASSO 4: Verificar
SELECT '=== ✅ RESULTADO ===' as info;
SELECT policyname, cmd, roles, permissive
FROM pg_policies
WHERE tablename = 'objects' AND policyname = 'client_docs_all';

-- PASSO 5: Verificar bucket
SELECT '=== 🗂️ BUCKET ===' as info;
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'client-documents';
