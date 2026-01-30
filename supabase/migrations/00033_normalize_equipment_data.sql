-- Migration: Normalize Equipment Data
-- Description: Migra dados de equipment_* da tabela contracts para a tabela equipment dedicada
-- Date: 2025-10-10
-- Relates to: Fix for equipment data inconsistency between contracts and equipment tables

-- ==============================================
-- PARTE 0: GARANTIR QUE COLUNAS EXISTEM
-- ==============================================

-- Adicionar colunas power e voltage se não existirem (necessário para migração de dados)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power VARCHAR(100);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS voltage VARCHAR(100);

COMMENT ON COLUMN equipment.power IS 'Equipment power specification (e.g., 450kVA)';
COMMENT ON COLUMN equipment.voltage IS 'Equipment voltage specification (e.g., 220V, 380V)';

-- ==============================================
-- PARTE 1: MIGRAR DADOS EXISTENTES
-- ==============================================

-- Criar registros na tabela equipment para contratos que têm dados equipment_*
-- mas não têm registro correspondente na tabela equipment
INSERT INTO equipment (
  user_id,
  contract_id,
  type,
  model,
  serial_number,
  location,
  manufacturer,
  year,
  condition,
  power,
  voltage,
  observations,
  quantity,
  installation_date,
  created_at,
  updated_at
)
SELECT
  c.user_id,
  c.id as contract_id,
  COALESCE(c.equipment_type, 'Gerador') as type,
  c.equipment_model as model,
  c.equipment_serial as serial_number,
  c.equipment_location as location,
  c.equipment_brand as manufacturer,
  c.equipment_year as year,
  c.equipment_condition as condition,
  c.equipment_power as power,
  c.equipment_voltage as voltage,
  NULL as observations,
  COALESCE(c.equipment_quantity, 1) as quantity,
  NULL as installation_date,
  NOW() as created_at,
  NOW() as updated_at
FROM contracts c
WHERE
  -- Tem pelo menos um campo de equipamento preenchido
  (c.equipment_type IS NOT NULL
   OR c.equipment_model IS NOT NULL
   OR c.equipment_serial IS NOT NULL
   OR c.equipment_location IS NOT NULL)
  -- E não existe registro correspondente na tabela equipment
  AND NOT EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.contract_id = c.id
  );

-- ==============================================
-- PARTE 2: ADICIONAR COMENTÁRIOS DE DEPRECAÇÃO
-- ==============================================

-- Marcar campos equipment_* como deprecated (mantidos por compatibilidade)
COMMENT ON COLUMN contracts.equipment_type IS '[DEPRECATED] Use tabela equipment - Tipo de equipamento';
COMMENT ON COLUMN contracts.equipment_model IS '[DEPRECATED] Use tabela equipment - Modelo do equipamento';
COMMENT ON COLUMN contracts.equipment_serial IS '[DEPRECATED] Use tabela equipment - Número de série';
COMMENT ON COLUMN contracts.equipment_location IS '[DEPRECATED] Use tabela equipment - Localização';
COMMENT ON COLUMN contracts.equipment_brand IS '[DEPRECATED] Use tabela equipment - Marca/Fabricante';
COMMENT ON COLUMN contracts.equipment_power IS '[DEPRECATED] Use tabela equipment - Potência';
COMMENT ON COLUMN contracts.equipment_voltage IS '[DEPRECATED] Use tabela equipment - Tensão';
COMMENT ON COLUMN contracts.equipment_year IS '[DEPRECATED] Use tabela equipment - Ano de fabricação';
COMMENT ON COLUMN contracts.equipment_condition IS '[DEPRECATED] Use tabela equipment - Condição';
COMMENT ON COLUMN contracts.equipment_quantity IS '[DEPRECATED] Use tabela equipment - Quantidade';

-- ==============================================
-- PARTE 3: CRIAR VIEW PARA COMPATIBILIDADE
-- ==============================================

-- View que une dados de contracts com equipment para facilitar queries existentes
DROP VIEW IF EXISTS contract_with_equipment CASCADE;
CREATE VIEW contract_with_equipment AS
SELECT
  c.*,
  e.type as eq_type,
  e.model as eq_model,
  e.serial_number as eq_serial_number,
  e.location as eq_location,
  e.manufacturer as eq_manufacturer,
  e.year as eq_year,
  e.condition as eq_condition,
  e.power as eq_power,
  e.voltage as eq_voltage,
  e.quantity as eq_quantity,
  e.observations as eq_observations,
  e.installation_date as eq_installation_date
FROM contracts c
LEFT JOIN equipment e ON e.contract_id = c.id;

COMMENT ON VIEW contract_with_equipment IS 'View de compatibilidade que une contratos com equipamentos. Use para leitura apenas.';

-- ==============================================
-- PARTE 4: ÍNDICES E OTIMIZAÇÕES
-- ==============================================

-- Garantir que índices necessários existem
CREATE INDEX IF NOT EXISTS idx_equipment_contract_id_active ON equipment(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_type_model ON equipment(type, model) WHERE type IS NOT NULL AND model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_year_condition ON equipment(year, condition) WHERE year IS NOT NULL;

-- ==============================================
-- PARTE 5: ESTATÍSTICAS E VALIDAÇÃO
-- ==============================================

-- Registrar estatísticas da migração
DO $$
DECLARE
  contracts_with_equipment_fields INTEGER;
  equipment_records INTEGER;
  migrated_records INTEGER;
BEGIN
  -- Contar contratos com campos equipment_*
  SELECT COUNT(*) INTO contracts_with_equipment_fields
  FROM contracts
  WHERE equipment_type IS NOT NULL
     OR equipment_model IS NOT NULL
     OR equipment_serial IS NOT NULL;

  -- Contar registros na tabela equipment
  SELECT COUNT(*) INTO equipment_records
  FROM equipment;

  -- Calcular quantos foram migrados (aproximado)
  migrated_records := equipment_records;

  RAISE NOTICE '=== ESTATÍSTICAS DA MIGRAÇÃO ===';
  RAISE NOTICE 'Contratos com dados equipment_*: %', contracts_with_equipment_fields;
  RAISE NOTICE 'Registros totais na tabela equipment: %', equipment_records;
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- ==============================================
-- PARTE 6: CONSTRAINTS E VALIDAÇÕES
-- ==============================================

-- Garantir que pelo menos type, model e location estejam preenchidos
-- para novos registros de equipment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'equipment_required_fields_check'
    ) THEN
        ALTER TABLE equipment
        ADD CONSTRAINT equipment_required_fields_check
        CHECK (
          (type IS NOT NULL AND type != '') OR
          (model IS NOT NULL AND model != '') OR
          (location IS NOT NULL AND location != '')
        );

        COMMENT ON CONSTRAINT equipment_required_fields_check ON equipment IS
        'Garante que pelo menos um dos campos principais (type, model, location) esteja preenchido';
    END IF;
END $$;
