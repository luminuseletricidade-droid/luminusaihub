-- Verificar políticas ativas no storage.objects para client-documents
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%client%' OR policyname LIKE '%documents%')
ORDER BY cmd, policyname;

-- Verificar configuração do bucket
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'client-documents';

-- Testar se usuário atual consegue ver o bucket
SELECT
    bucket_id,
    COUNT(*) as total_files,
    SUM((metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'client-documents'
GROUP BY bucket_id;
