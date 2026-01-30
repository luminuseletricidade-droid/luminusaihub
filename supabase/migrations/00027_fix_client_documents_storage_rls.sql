-- Migration: Fix client-documents bucket RLS policies
-- Description: Corrige políticas de Row-Level Security para permitir upload de documentos
-- Created: 2025-01-03

-- ============================================================================
-- CORREÇÃO DE RLS - BUCKET CLIENT-DOCUMENTS
-- ============================================================================

-- 1. Remover políticas antigas relacionadas a client-documents
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

-- Remover variações de nomes de políticas (de outras migrações)
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;

-- 2. Criar políticas permissivas para client-documents

-- Permitir INSERT (upload)
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload to client-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'client-documents'
);

-- Permitir SELECT (visualização)
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can view client-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'client-documents'
);

-- Permitir UPDATE (atualização de metadados)
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update client-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- Permitir DELETE (exclusão)
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete client-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'client-documents'
);

-- ============================================================================
-- VERIFICAR BUCKET client-documents EXISTE
-- ============================================================================

-- Verificar se bucket existe, caso contrário criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'client-documents'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'client-documents',
            'client-documents',
            false, -- Não público, requer autenticação
            10485760, -- 10MB limit
            ARRAY[
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        );

        RAISE NOTICE '✅ Bucket client-documents criado com sucesso';
    ELSE
        RAISE NOTICE '✅ Bucket client-documents já existe';
    END IF;
END;
$$;

-- ============================================================================
-- ATUALIZAR CONFIGURAÇÕES DO BUCKET (SE JÁ EXISTE)
-- ============================================================================

-- Garantir que bucket não seja público e tenha limite de tamanho adequado
UPDATE storage.buckets
SET
    public = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
WHERE id = 'client-documents';

-- ============================================================================
-- CRIAR VIEW PARA VERIFICAR UPLOADS
-- ============================================================================

CREATE OR REPLACE VIEW v_client_document_uploads AS
SELECT
    o.id,
    o.name,
    o.bucket_id,
    o.owner,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.metadata,
    CASE
        WHEN o.metadata->>'mimetype' LIKE 'image/%' THEN '🖼️ Imagem'
        WHEN o.metadata->>'mimetype' = 'application/pdf' THEN '📄 PDF'
        WHEN o.metadata->>'mimetype' LIKE 'application/vnd.ms-excel%'
          OR o.metadata->>'mimetype' LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' THEN '📊 Excel'
        WHEN o.metadata->>'mimetype' LIKE 'application/msword%'
          OR o.metadata->>'mimetype' LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml%' THEN '📝 Word'
        ELSE '📎 Arquivo'
    END as tipo_arquivo,
    ROUND((o.metadata->>'size')::numeric / 1024.0, 2) as tamanho_kb
FROM storage.objects o
WHERE o.bucket_id = 'client-documents'
ORDER BY o.created_at DESC;

COMMENT ON VIEW v_client_document_uploads IS
'View para monitorar uploads no bucket client-documents';

-- ============================================================================
-- FUNÇÃO PARA LIMPAR ARQUIVOS ÓRFÃOS (OPCIONAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_client_documents(days_old integer DEFAULT 30)
RETURNS TABLE (
    deleted_count integer,
    total_size_mb numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_size numeric := 0;
BEGIN
    -- CUIDADO: Esta função deve ser usada com cautela
    -- Remove arquivos do bucket que não têm referência em nenhuma tabela

    -- Por enquanto, apenas retorna estatísticas sem deletar
    SELECT
        COUNT(*),
        ROUND(SUM((metadata->>'size')::numeric) / 1024.0 / 1024.0, 2)
    INTO v_count, v_size
    FROM storage.objects
    WHERE
        bucket_id = 'client-documents'
        AND created_at < NOW() - (days_old || ' days')::interval
        -- Adicionar mais condições para verificar se arquivo está órfão
    ;

    RETURN QUERY SELECT v_count, COALESCE(v_size, 0);
END;
$$;

COMMENT ON FUNCTION cleanup_orphaned_client_documents(integer) IS
'Função para identificar e limpar arquivos órfãos no bucket client-documents (usar com cuidado)';

-- ============================================================================
-- VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar políticas criadas
DO $$
DECLARE
    v_policy_count integer;
BEGIN
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%client-documents%';

    RAISE NOTICE '✅ Total de políticas RLS para client-documents: %', v_policy_count;
END;
$$;

-- Listar todas as políticas
SELECT
    policyname,
    cmd as operacao,
    permissive as permissiva,
    roles as para_roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%client-documents%'
ORDER BY cmd, policyname;

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

/*
RESUMO DAS POLÍTICAS RLS:

1. INSERT (Upload):
   - Qualquer usuário autenticado pode fazer upload
   - Não há restrição por user_id (permite multi-tenant)

2. SELECT (Visualização):
   - Qualquer usuário autenticado pode visualizar
   - Recomendação: Adicionar filtro por user_id se necessário privacidade

3. UPDATE (Atualização):
   - Qualquer usuário autenticado pode atualizar metadados
   - Arquivos do bucket são acessíveis por todos os usuários

4. DELETE (Exclusão):
   - Qualquer usuário autenticado pode deletar
   - Considerar adicionar restrição por owner se necessário

ATENÇÃO:
- Bucket configurado como NÃO PÚBLICO (public = false)
- Requer autenticação para acesso
- Limite de 10MB por arquivo
- Tipos de arquivo permitidos: imagens, PDF, Word, Excel

PARA RESTRINGIR POR USUÁRIO:
Se precisar que cada usuário veja apenas seus arquivos, adicionar:

WITH CHECK (auth.uid()::text = (storage.foldername(name))[1])
USING (auth.uid()::text = (storage.foldername(name))[1])

E organizar arquivos em pastas: client-documents/{user_id}/{filename}
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00027_fix_client_documents_storage_rls.sql aplicada com sucesso';
    RAISE NOTICE '🗂️ Bucket: client-documents configurado';
    RAISE NOTICE '🔒 RLS: Políticas permissivas para authenticated users';
    RAISE NOTICE '📊 View: v_client_document_uploads disponível';
    RAISE NOTICE '🧹 Função: cleanup_orphaned_client_documents() disponível';
END;
$$;
