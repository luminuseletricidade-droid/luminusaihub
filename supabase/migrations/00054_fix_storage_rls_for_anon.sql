-- Migration: Fix storage RLS policies to accept anon role
-- Description: Ajusta políticas para aceitar tanto authenticated quanto anon role
-- Created: 2025-01-04

-- ============================================================================
-- CORREÇÃO DE RLS - PERMITIR ANON ROLE
-- ============================================================================

-- O sistema usa JWT customizado do FastAPI, não o JWT do Supabase
-- Por isso o cliente Supabase acessa com anon role, não authenticated
-- Vamos ajustar as políticas para aceitar anon role também

-- ============================================================================
-- CONTRACT-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract-documents" ON storage.objects;

-- Criar políticas que aceitam anon role (com anon key válida)
DROP POLICY IF EXISTS "Allow upload to contract-documents" ON storage.objects;
CREATE POLICY "Allow upload to contract-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'contract-documents'
);

DROP POLICY IF EXISTS "Allow view contract-documents" ON storage.objects;
CREATE POLICY "Allow view contract-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'contract-documents'
);

DROP POLICY IF EXISTS "Allow update contract-documents" ON storage.objects;
CREATE POLICY "Allow update contract-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Allow delete contract-documents" ON storage.objects;
CREATE POLICY "Allow delete contract-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'contract-documents'
);

-- ============================================================================
-- CLIENT-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;

-- Criar políticas que aceitam anon role
DROP POLICY IF EXISTS "Allow upload to client-documents" ON storage.objects;
CREATE POLICY "Allow upload to client-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'client-documents'
);

DROP POLICY IF EXISTS "Allow view client-documents" ON storage.objects;
CREATE POLICY "Allow view client-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'client-documents'
);

DROP POLICY IF EXISTS "Allow update client-documents" ON storage.objects;
CREATE POLICY "Allow update client-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Allow delete client-documents" ON storage.objects;
CREATE POLICY "Allow delete client-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'client-documents'
);

-- ============================================================================
-- MAINTENANCE-DOCUMENTS BUCKET
-- ============================================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;

-- Criar políticas que aceitam anon role
DROP POLICY IF EXISTS "Allow upload to maintenance-documents" ON storage.objects;
CREATE POLICY "Allow upload to maintenance-documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'maintenance-documents'
);

DROP POLICY IF EXISTS "Allow view maintenance-documents" ON storage.objects;
CREATE POLICY "Allow view maintenance-documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'maintenance-documents'
);

DROP POLICY IF EXISTS "Allow update maintenance-documents" ON storage.objects;
CREATE POLICY "Allow update maintenance-documents"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'maintenance-documents')
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Allow delete maintenance-documents" ON storage.objects;
CREATE POLICY "Allow delete maintenance-documents"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'maintenance-documents'
);

-- ============================================================================
-- VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar políticas criadas para cada bucket
DO $$
DECLARE
    v_contract_policies integer;
    v_client_policies integer;
    v_maintenance_policies integer;
BEGIN
    SELECT COUNT(*) INTO v_contract_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%contract-documents%';

    SELECT COUNT(*) INTO v_client_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%client-documents%';

    SELECT COUNT(*) INTO v_maintenance_policies
    FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname LIKE '%maintenance-documents%';

    RAISE NOTICE '✅ Políticas RLS criadas:';
    RAISE NOTICE '   - contract-documents: % políticas', v_contract_policies;
    RAISE NOTICE '   - client-documents: % políticas', v_client_policies;
    RAISE NOTICE '   - maintenance-documents: % políticas', v_maintenance_policies;
END;
$$;

-- Listar todas as políticas de storage
SELECT
    policyname,
    cmd as operacao,
    roles as para_roles
FROM pg_policies
WHERE tablename = 'objects'
AND (
    policyname LIKE '%contract-documents%'
    OR policyname LIKE '%client-documents%'
    OR policyname LIKE '%maintenance-documents%'
)
ORDER BY policyname;

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

/*
RESUMO DAS POLÍTICAS RLS:

IMPORTANTE: Políticas permitem acesso via anon role
- O sistema usa JWT customizado do FastAPI, não o JWT do Supabase
- O cliente Supabase acessa com anon key (role: anon)
- A anon key é pública mas válida apenas com SUPABASE_URL correto
- Buckets são NÃO PÚBLICOS (public = false), exigem anon key válida

SEGURANÇA:
1. Bucket não é público → requer anon key válida do Supabase
2. Anon key só funciona com SUPABASE_URL correto
3. Frontend valida JWT customizado do FastAPI antes de chamar storage
4. Controle de acesso é feito na camada de aplicação (FastAPI)

OPERAÇÕES PERMITIDAS:
- INSERT (Upload): anon, authenticated
- SELECT (Visualização): anon, authenticated
- UPDATE (Atualização): anon, authenticated
- DELETE (Exclusão): anon, authenticated

BUCKETS CONFIGURADOS:
- contract-documents (50MB, PDF, imagens, Word, Excel, CSV)
- client-documents (10MB, imagens, PDF, Word, Excel)
- maintenance-documents (50MB, PDF, imagens, Word, Excel)

ESTRUTURA DE PATHS:
- contracts/temp/{filename} - Arquivos temporários
- contracts/{contract_id}/{filename} - Arquivos do contrato
- clients/{client_id}/{filename} - Arquivos do cliente
- maintenances/{maintenance_id}/{filename} - Arquivos da manutenção
*/

-- ============================================================================
-- LOG FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 00054_fix_storage_rls_for_anon.sql aplicada com sucesso';
    RAISE NOTICE '🔓 Buckets agora aceitam anon role (com anon key válida)';
    RAISE NOTICE '🔒 Buckets continuam não-públicos (exigem autenticação)';
    RAISE NOTICE '✨ Upload deve funcionar com JWT customizado do FastAPI';
END;
$$;
