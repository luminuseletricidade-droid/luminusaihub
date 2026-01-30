-- Atualizar documentos com metadata.category = 'contrato_original' para 'original'
-- Isso padroniza todos os PDFs originais para usar 'original' como category

UPDATE contract_documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{category}',
  '"original"'
)
WHERE metadata->>'category' = 'contrato_original';

-- Verificar quantos documentos foram atualizados
SELECT
  'Documentos atualizados: ' || count(*) as resultado
FROM contract_documents
WHERE metadata->>'category' = 'original';
