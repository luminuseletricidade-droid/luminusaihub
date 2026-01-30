-- Adicionar suporte a todos os tipos de documentos nos buckets
-- EXCETO contract-documents que aceita APENAS PDF
-- Migration: 00019_add_csv_support_to_buckets.sql

-- Atualizar bucket client-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/html', 'application/rtf',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/xml', 'application/json'
]
WHERE id = 'client-documents';

-- Atualizar bucket contract-documents para aceitar APENAS PDF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'contract-documents';

-- Atualizar bucket maintenance-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/html', 'application/rtf',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/xml', 'application/json'
]
WHERE id = 'maintenance-documents';
