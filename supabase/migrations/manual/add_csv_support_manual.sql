-- ============================================
-- EXECUTAR NO SQL EDITOR DO SUPABASE DASHBOARD
-- ============================================
-- Adicionar suporte a todos os tipos de documentos nos buckets
-- EXCETO contract-documents que aceita APENAS PDF

-- Atualizar bucket client-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- PDFs
  'application/pdf',

  -- Imagens
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',

  -- Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  -- Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  -- CSV
  'text/csv',

  -- PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  -- Texto
  'text/plain',
  'text/html',
  'application/rtf',

  -- Outros
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/xml',
  'application/json'
]
WHERE id = 'client-documents';

-- Atualizar bucket contract-documents para aceitar APENAS PDF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf'
]
WHERE id = 'contract-documents';

-- Atualizar bucket maintenance-documents para aceitar todos os tipos de arquivo
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- PDFs
  'application/pdf',

  -- Imagens
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',

  -- Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  -- Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  -- CSV
  'text/csv',

  -- PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  -- Texto
  'text/plain',
  'text/html',
  'application/rtf',

  -- Outros
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/xml',
  'application/json'
]
WHERE id = 'maintenance-documents';

-- Verificar as mudanças
SELECT id, name, allowed_mime_types
FROM storage.buckets
WHERE id IN ('client-documents', 'contract-documents', 'maintenance-documents');
