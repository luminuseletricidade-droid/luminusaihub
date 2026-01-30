-- Migration: Add CNPJ Functions
-- Description: Adiciona funções para limpeza e validação de CNPJ
-- Date: 2025-10-02

-- Função para limpar CNPJ (remover caracteres não numéricos)
CREATE OR REPLACE FUNCTION clean_cnpj(cnpj_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF cnpj_input IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN regexp_replace(cnpj_input, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar formato do CNPJ
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    cleaned_cnpj TEXT;
BEGIN
    IF cnpj_input IS NULL THEN
        RETURN FALSE;
    END IF;

    cleaned_cnpj := clean_cnpj(cnpj_input);

    -- CNPJ deve ter exatamente 14 dígitos
    IF length(cleaned_cnpj) != 14 THEN
        RETURN FALSE;
    END IF;

    -- CNPJs inválidos conhecidos (todos dígitos iguais)
    IF cleaned_cnpj IN ('00000000000000', '11111111111111', '22222222222222',
                        '33333333333333', '44444444444444', '55555555555555',
                        '66666666666666', '77777777777777', '88888888888888',
                        '99999999999999') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Adicionar constraint de validação na tabela clients
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS chk_cnpj_format;

ALTER TABLE clients
ADD CONSTRAINT chk_cnpj_format
CHECK (cnpj IS NULL OR validate_cnpj(cnpj));

-- Comentários
COMMENT ON FUNCTION clean_cnpj(TEXT) IS 'Remove caracteres não numéricos do CNPJ';
COMMENT ON FUNCTION validate_cnpj(TEXT) IS 'Valida formato básico do CNPJ (14 dígitos, não pode ser sequência)';
