-- Migration: Fix contract-documents bucket RLS policies
-- Description: Corrige políticas de Row-Level Security para permitir upload de documentos
-- Created: 2025-01-04

-- ============================================================================
-- CORREÇÃO DE RLS - BUCKET CONTRACT-DOCUMENTS
-- ============================================================================

-- 1. Remover políticas antigas relacionadas a contract-documents
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

-- Remover variações de nomes de políticas (de outras migrações)
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;

-- 2. Criar políticas permissivas para contract-documents

-- Permitir INSERT (upload)
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload to contract-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'contract-documents'
);

-- Permitir SELECT (visualização)
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can view contract-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'contract-documents'
);

-- Permitir UPDATE (atualização de metadados)
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update contract-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');

-- Permitir DELETE (exclusão)
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete contract-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'contract-documents'
);

-- ============================================================================
-- VERIFICAR BUCKET contract-documents EXISTE
-- ============================================================================

-- Verificar se bucket existe, caso contrário criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'contract-documents'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'contract-documents',
            'contract-documents',
            false, -- Não público, requer autenticação
            52428800, -- 50MB limit
            ARRAY[
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        );

        RAISE NOTICE '✅ Bucket contract-documents criado com sucesso';
    ELSE
        RAISE NOTICE '✅ Bucket contract-documents já existe';
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
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
WHERE id = 'contract-documents';

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
    AND policyname LIKE '%contract-documents%';

    RAISE NOTICE '✅ Total de políticas RLS para contract-documents: %', v_policy_count;
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
AND policyname LIKE '%contract-documents%'
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
- Limite de 50MB por arquivo
- Tipos de arquivo permitidos: imagens, PDF, Word, Excel, CSV

ESTRUTURA DE PATHS:
- contracts/temp/{filename} - Arquivos temporários durante upload
- contracts/{contract_id}/{filename} - Arquivos finalizados do contrato
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00053_fix_contract_documents_storage_rls.sql aplicada com sucesso';
    RAISE NOTICE '🗂️ Bucket: contract-documents configurado';
    RAISE NOTICE '🔒 RLS: Políticas permissivas para authenticated users';
    RAISE NOTICE '📤 Permitido: Upload, visualização, atualização e exclusão';
END;
$$;
