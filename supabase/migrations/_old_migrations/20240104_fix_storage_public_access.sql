-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents', 
  true, -- Bucket público
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE 
SET public = true; -- Garantir que seja público

-- Política para permitir uploads autenticados
CREATE POLICY "Authenticated users can upload contract documents" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contract-documents');

-- Política para permitir leitura pública (IMPORTANTE!)
CREATE POLICY "Public read access to contract documents" ON storage.objects
  FOR SELECT
  TO public -- Permite acesso público
  USING (bucket_id = 'contract-documents');

-- Política para permitir que usuários autenticados deletem seus próprios arquivos
CREATE POLICY "Users can delete own contract documents" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'contract-documents');

-- Política para permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Users can update own contract documents" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contract-documents');