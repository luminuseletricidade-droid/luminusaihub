-- Add missing equipment fields to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS equipment_serial TEXT,
ADD COLUMN IF NOT EXISTS equipment_power TEXT,
ADD COLUMN IF NOT EXISTS equipment_voltage TEXT,
ADD COLUMN IF NOT EXISTS equipment_brand TEXT,
ADD COLUMN IF NOT EXISTS equipment_year TEXT,
ADD COLUMN IF NOT EXISTS equipment_condition TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS technical_notes TEXT,
ADD COLUMN IF NOT EXISTS special_conditions TEXT,
ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Add missing client fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN public.contracts.equipment_serial IS 'Número de série do equipamento';
COMMENT ON COLUMN public.contracts.equipment_power IS 'Potência do equipamento (ex: 150 kVA)';
COMMENT ON COLUMN public.contracts.equipment_voltage IS 'Tensão do equipamento (ex: 380V)';
COMMENT ON COLUMN public.contracts.equipment_brand IS 'Marca/Fabricante do equipamento';
COMMENT ON COLUMN public.contracts.equipment_year IS 'Ano de fabricação do equipamento';
COMMENT ON COLUMN public.contracts.equipment_condition IS 'Condição do equipamento (Novo, Usado, etc)';
COMMENT ON COLUMN public.contracts.payment_terms IS 'Condições de pagamento do contrato';
COMMENT ON COLUMN public.contracts.technical_notes IS 'Notas técnicas sobre o contrato/equipamento';
COMMENT ON COLUMN public.contracts.special_conditions IS 'Condições especiais do contrato';
COMMENT ON COLUMN public.contracts.warranty_terms IS 'Termos de garantia';

COMMENT ON COLUMN public.clients.city IS 'Cidade do cliente';
COMMENT ON COLUMN public.clients.state IS 'Estado/UF do cliente';
COMMENT ON COLUMN public.clients.zip_code IS 'CEP do cliente';
COMMENT ON COLUMN public.clients.contact_person IS 'Pessoa de contato no cliente';