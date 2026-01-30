/**
 * ViaCEP API Service
 * Handles communication with ViaCEP API for Brazilian postal code validation
 */

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;         // estado
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export interface AddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  enderecoCompleto: string; // logradouro + bairro concatenated
}

export interface ViaCepError {
  message: string;
  type: 'NOT_FOUND' | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_FORMAT';
}

// Cache para evitar requisições duplicadas
const cache = new Map<string, AddressData>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const REQUEST_TIMEOUT = 5000; // 5 segundos

/**
 * Busca dados de endereço pelo CEP usando a API ViaCEP
 */
export async function fetchAddressByCep(cep: string): Promise<AddressData> {
  // Limpar CEP (remover formatação)
  const cleanCep = cep.replace(/\D/g, '');
  
  // Validar formato básico
  if (cleanCep.length !== 8) {
    throw {
      message: 'CEP deve conter 8 dígitos no formato 00000-000',
      type: 'INVALID_FORMAT'
    } as ViaCepError;
  }

  // Verificar cache primeiro
  const cacheKey = cleanCep;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw {
        message: 'Não foi possível buscar o CEP. Verifique sua conexão ou preencha manualmente.',
        type: 'NETWORK_ERROR'
      } as ViaCepError;
    }

    const data: ViaCepResponse = await response.json();

    // Verificar se CEP foi encontrado
    if (data.erro || !data.logradouro) {
      throw {
        message: 'CEP não encontrado. Verifique o número ou preencha manualmente.',
        type: 'NOT_FOUND'
      } as ViaCepError;
    }

    // Mapear dados da resposta para nosso formato
    const addressData: AddressData = {
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento || '',
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      enderecoCompleto: `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`.trim()
    };

    // Armazenar no cache
    cache.set(cacheKey, addressData);
    
    // Limpar cache após duração definida
    setTimeout(() => {
      cache.delete(cacheKey);
    }, CACHE_DURATION);

    return addressData;

  } catch (error) {
    // Se foi abortado por timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        message: 'A busca demorou muito. Tente novamente ou preencha manualmente.',
        type: 'TIMEOUT'
      } as ViaCepError;
    }

    // Se já é um ViaCepError, re-throw
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }

    // Erro genérico de rede
    throw {
      message: 'Não foi possível buscar o CEP. Verifique sua conexão ou preencha manualmente.',
      type: 'NETWORK_ERROR'
    } as ViaCepError;
  }
}

/**
 * Formata CEP para exibição (00000-000)
 */
export function formatCep(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length <= 5) {
    return cleaned;
  }
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
}

/**
 * Valida se CEP tem formato válido
 */
export function isValidCepFormat(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 && /^\d{8}$/.test(cleaned);
}

/**
 * Limpa cache (útil para testes)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}
