-- Correção da Reestruturação - Fase 1: Limpeza de dados inválidos

-- 1. Primeiro, limpar dados inválidos na tabela ai_generated_plans
-- Deletar registros onde contract_id não pode ser convertido para UUID
DELETE FROM ai_generated_plans 
WHERE contract_id IS NOT NULL 
AND contract_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Atualizar registros com contract_id que são números de contrato para NULL
-- (estes dados serão revinculados posteriormente através de JOIN com contracts)
UPDATE ai_generated_plans 
SET contract_id = NULL 
WHERE contract_id IS NOT NULL 
AND contract_id IN (SELECT contract_number FROM contracts);

-- 3. Agora alterar o tipo da coluna contract_id
ALTER TABLE ai_generated_plans 
ALTER COLUMN contract_id TYPE uuid USING 
CASE 
  WHEN contract_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  THEN contract_id::uuid 
  ELSE NULL 
END;