-- Migration: Create Storage Buckets
-- Description: Cria buckets de storage no Supabase para documentos e arquivos
-- Date: 2025-10-02

-- Criar bucket para documentos de contratos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para documentos de manutenção
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-documents',
  'maintenance-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso (RLS)
-- Contract Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
CREATE POLICY "Users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can view their contract documents" ON storage.objects;
CREATE POLICY "Users can view their contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can update their contract documents" ON storage.objects;
CREATE POLICY "Users can update their contract documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

DROP POLICY IF EXISTS "Users can delete their contract documents" ON storage.objects;
CREATE POLICY "Users can delete their contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Client Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
CREATE POLICY "Users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can view their client documents" ON storage.objects;
CREATE POLICY "Users can view their client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can update their client documents" ON storage.objects;
CREATE POLICY "Users can update their client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Users can delete their client documents" ON storage.objects;
CREATE POLICY "Users can delete their client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Maintenance Documents: usuário só pode acessar seus próprios arquivos
DROP POLICY IF EXISTS "Users can upload maintenance documents" ON storage.objects;
CREATE POLICY "Users can upload maintenance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can view their maintenance documents" ON storage.objects;
CREATE POLICY "Users can view their maintenance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can update their maintenance documents" ON storage.objects;
CREATE POLICY "Users can update their maintenance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-documents');

DROP POLICY IF EXISTS "Users can delete their maintenance documents" ON storage.objects;
CREATE POLICY "Users can delete their maintenance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-documents');
