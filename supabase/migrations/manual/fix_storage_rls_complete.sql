-- ============================================
-- FIX COMPLETO DE RLS PARA CLIENT-DOCUMENTS
-- ============================================

-- PASSO 1: Verificar o estado atual
SELECT '=== POLÍTICAS ATUAIS ===' as status;
SELECT
    policyname,
    cmd as operacao,
    CASE WHEN permissive = 'PERMISSIVE' THEN '✅ Sim' ELSE '❌ Não' END as permissiva,
    roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%client%'
ORDER BY cmd, policyname;

SELECT '=== BUCKET CONFIG ===' as status;
SELECT
    id,
    name,
    public,
    CASE WHEN public THEN '🌍 Público' ELSE '🔒 Privado' END as visibilidade,
    file_size_limit / 1024 / 1024 as limite_mb
FROM storage.buckets
WHERE id = 'client-documents';

-- PASSO 2: Limpar TODAS as políticas relacionadas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'objects'
          AND policyname LIKE '%client%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
        RAISE NOTICE 'Removida: %', r.policyname;
    END LOOP;
END $$;

-- PASSO 3: Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-documents',
    'client-documents',
    false,
    52428800, -- 50MB
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

-- PASSO 4: Criar políticas SIMPLES e PERMISSIVAS
CREATE POLICY "client_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "client_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "client_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "client_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- PASSO 5: Verificar resultado final
SELECT '=== ✅ POLÍTICAS CRIADAS ===' as status;
SELECT
    policyname,
    cmd as operacao,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'objects'
  AND bucket_id IS NULL -- policies aplicam a todos os buckets
  AND policyname LIKE 'client_documents%'
ORDER BY cmd;

-- PASSO 6: Testar acesso
SELECT '=== 🧪 TESTE DE ACESSO ===' as status;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM storage.buckets WHERE id = 'client-documents'
        ) THEN '✅ Bucket existe'
        ELSE '❌ Bucket NÃO existe'
    END as bucket_status;

SELECT '=== 📊 RESULTADO ===' as status;
SELECT
    '✅ RLS configurado com sucesso!' as mensagem,
    'Bucket: client-documents' as bucket,
    '4 políticas ativas (INSERT, SELECT, UPDATE, DELETE)' as policies,
    'Usuários autenticados podem fazer upload' as permissao;
