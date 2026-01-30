import { useState, useCallback, useRef } from 'react';
import { fetchAddressByCep, formatCep, isValidCepFormat, AddressData, ViaCepError } from '@/services/viaCepApi';

interface CepValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

interface CepSearchResult {
  success: boolean;
  data?: AddressData;
  error?: string;
}

export const useCepValidation = () => {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchedCepRef = useRef<string | null>(null);
  const inFlightPromiseRef = useRef<Promise<CepSearchResult> | null>(null);

  // Regex para CEP: 00000-000 ou 00000000
  const CEP_REGEX = /^\d{8}$/;
  const CEP_FORMAT_REGEX = /^(\d{5})(\d{3})$/;

  const formatCepValue = useCallback((value: string): string => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Se vazio, retorna vazio
    if (!cleaned) return '';

    // Se mais de 8 dígitos, pega só os 8 primeiros
    const truncated = cleaned.slice(0, 8);

    // Formata como XXXXX-XXX
    const match = truncated.match(CEP_FORMAT_REGEX);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }

    // Se não está pronto para formatação, retorna o parcial
    return truncated;
  }, []);

  const validateCep = useCallback((value: string): CepValidationResult => {
    setError('');

    if (!value || value.trim() === '') {
      return {
        isValid: true,
        formatted: '',
      };
    }

    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Verifica se tem exatamente 8 dígitos
    if (!CEP_REGEX.test(cleaned)) {
      const errorMsg = cleaned.length < 8
        ? `CEP incompleto (${cleaned.length}/8 dígitos)`
        : 'CEP deve conter apenas números';
      setError(errorMsg);
      return {
        isValid: false,
        formatted: formatCepValue(cleaned),
        error: errorMsg
      };
    }

    // Verifica CEP's conhecidos como inválidos
    const invalidCeps = ['00000000', '11111111', '22222222', '33333333', '44444444', '55555555', '66666666', '77777777', '88888888', '99999999'];
    if (invalidCeps.includes(cleaned)) {
      const errorMsg = 'Este CEP não é válido';
      setError(errorMsg);
      return {
        isValid: false,
        formatted: formatCepValue(cleaned),
        error: errorMsg
      };
    }

    const formatted = formatCepValue(cleaned);
    return {
      isValid: true,
      formatted
    };
  }, [CEP_REGEX, CEP_FORMAT_REGEX, formatCepValue]);

  const searchCep = useCallback(async (cep: string): Promise<CepSearchResult> => {
    const cleaned = (cep || '').replace(/\D/g, '');

    // Se já buscamos este CEP com sucesso e não mudou, não dispare de novo
    if (lastSearchedCepRef.current === cleaned && inFlightPromiseRef.current === null) {
      return { success: false, error: undefined };
    }

    // Cancelar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Se já existe uma requisição em andamento para este CEP, reutilize a mesma
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    const promise = new Promise<CepSearchResult>((resolve) => {
      debounceRef.current = setTimeout(async () => {
        // Validar formato antes de buscar
        const validation = validateCep(cleaned);
        if (!validation.isValid) {
          inFlightPromiseRef.current = null;
          resolve({ success: false, error: validation.error });
          return;
        }

        setIsLoading(true);
        setError('');

        try {
          const addressData = await fetchAddressByCep(cleaned);
          lastSearchedCepRef.current = cleaned;
          resolve({ success: true, data: addressData });
        } catch (error) {
          const viaCepError = error as ViaCepError;
          const errorMessage = viaCepError.message || 'Erro ao buscar CEP';
          setError(errorMessage);
          resolve({ success: false, error: errorMessage });
        } finally {
          inFlightPromiseRef.current = null;
          setIsLoading(false);
        }
      }, 500); // Debounce de 500ms
    });

    inFlightPromiseRef.current = promise;
    return promise;
  }, [validateCep]);

  const handleCepChange = useCallback((value: string): string => {
    return formatCepValue(value);
  }, [formatCepValue]);

  const handleCepBlur = useCallback((value: string): CepValidationResult => {
    return validateCep(value);
  }, [validateCep]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    formatCep: formatCepValue,
    validateCep,
    searchCep,
    handleCepChange,
    handleCepBlur,
    clearError,
    error,
    isLoading,
    setError
  };
};