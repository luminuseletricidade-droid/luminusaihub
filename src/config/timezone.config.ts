/**
 * Configuração de Timezone
 *
 * Centraliza a configuração de timezone do sistema
 * Pode ser controlado por variável de ambiente VITE_TIMEZONE
 *
 * Timezones suportados:
 * - America/Sao_Paulo (UTC-3) - Padrão
 * - America/Fortaleza (UTC-3)
 * - America/Recife (UTC-3)
 * - America/Manaus (UTC-4)
 * - America/Cuiaba (UTC-4)
 * - America/Campo_Grande (UTC-4)
 * - America/Belem (UTC-3)
 * - America/Maceio (UTC-3)
 * - America/Bahia (UTC-3)
 * - America/Araguaina (UTC-3)
 * - America/Noronha (UTC-2)
 * - America/Boa_Vista (UTC-4)
 * - America/Porto_Velho (UTC-4)
 * - America/Rio_Branco (UTC-5)
 */

export interface TimezoneConfig {
  /** Nome do timezone (ex: America/Sao_Paulo) */
  timezone: string;
  /** Offset em relação ao UTC (ex: -3, -4) */
  utcOffset: number;
  /** Código de localidade (ex: pt-BR) */
  locale: string;
  /** Nome amigável do timezone */
  displayName: string;
}

/**
 * Mapeamento de timezones brasileiros
 */
const TIMEZONE_MAP: Record<string, TimezoneConfig> = {
  'America/Sao_Paulo': {
    timezone: 'America/Sao_Paulo',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Horário de Brasília (UTC-3)'
  },
  'America/Fortaleza': {
    timezone: 'America/Fortaleza',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Fortaleza (UTC-3)'
  },
  'America/Recife': {
    timezone: 'America/Recife',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Recife (UTC-3)'
  },
  'America/Manaus': {
    timezone: 'America/Manaus',
    utcOffset: -4,
    locale: 'pt-BR',
    displayName: 'Manaus (UTC-4)'
  },
  'America/Cuiaba': {
    timezone: 'America/Cuiaba',
    utcOffset: -4,
    locale: 'pt-BR',
    displayName: 'Cuiabá (UTC-4)'
  },
  'America/Campo_Grande': {
    timezone: 'America/Campo_Grande',
    utcOffset: -4,
    locale: 'pt-BR',
    displayName: 'Campo Grande (UTC-4)'
  },
  'America/Belem': {
    timezone: 'America/Belem',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Belém (UTC-3)'
  },
  'America/Maceio': {
    timezone: 'America/Maceio',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Maceió (UTC-3)'
  },
  'America/Bahia': {
    timezone: 'America/Bahia',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Salvador (UTC-3)'
  },
  'America/Araguaina': {
    timezone: 'America/Araguaina',
    utcOffset: -3,
    locale: 'pt-BR',
    displayName: 'Araguaína (UTC-3)'
  },
  'America/Noronha': {
    timezone: 'America/Noronha',
    utcOffset: -2,
    locale: 'pt-BR',
    displayName: 'Fernando de Noronha (UTC-2)'
  },
  'America/Boa_Vista': {
    timezone: 'America/Boa_Vista',
    utcOffset: -4,
    locale: 'pt-BR',
    displayName: 'Boa Vista (UTC-4)'
  },
  'America/Porto_Velho': {
    timezone: 'America/Porto_Velho',
    utcOffset: -4,
    locale: 'pt-BR',
    displayName: 'Porto Velho (UTC-4)'
  },
  'America/Rio_Branco': {
    timezone: 'America/Rio_Branco',
    utcOffset: -5,
    locale: 'pt-BR',
    displayName: 'Rio Branco (UTC-5)'
  }
};

/**
 * Obtém o timezone configurado
 * Prioridade:
 * 1. Variável de ambiente VITE_TIMEZONE
 * 2. Valor padrão: America/Sao_Paulo
 */
export const getTimezone = (): string => {
  const envTimezone = import.meta.env.VITE_TIMEZONE;

  if (envTimezone && TIMEZONE_MAP[envTimezone]) {
    console.log(`✅ Timezone configurado via env: ${envTimezone}`);
    return envTimezone;
  }

  // Fallback para São Paulo
  const defaultTimezone = 'America/Sao_Paulo';
  console.log(`⚙️ Usando timezone padrão: ${defaultTimezone}`);
  return defaultTimezone;
};

/**
 * Obtém a configuração completa do timezone atual
 */
export const getTimezoneConfig = (): TimezoneConfig => {
  const timezone = getTimezone();
  return TIMEZONE_MAP[timezone] || TIMEZONE_MAP['America/Sao_Paulo'];
};

/**
 * Obtém o offset UTC do timezone atual
 */
export const getTimezoneOffset = (): number => {
  return getTimezoneConfig().utcOffset;
};

/**
 * Obtém o locale do timezone atual
 */
export const getLocale = (): string => {
  return getTimezoneConfig().locale;
};

/**
 * Lista todos os timezones disponíveis
 */
export const getAvailableTimezones = (): TimezoneConfig[] => {
  return Object.values(TIMEZONE_MAP);
};

/**
 * Valida se um timezone é suportado
 */
export const isValidTimezone = (timezone: string): boolean => {
  return timezone in TIMEZONE_MAP;
};

/**
 * Aplica o offset do timezone a uma data
 * NOTA: Esta função é para casos especiais onde conversão de timezone é necessária
 * Para a maioria dos casos, use as funções de dateUtils.ts que NÃO convertem timezone
 */
export const applyTimezoneOffset = (date: Date, targetTimezone?: string): Date => {
  const tz = targetTimezone || getTimezone();
  const config = TIMEZONE_MAP[tz];

  if (!config) {
    console.warn(`Timezone ${tz} não encontrado, usando São Paulo`);
    return date;
  }

  // Calcula o offset em milissegundos
  const offsetMs = config.utcOffset * 60 * 60 * 1000;

  // Aplica o offset
  return new Date(date.getTime() + offsetMs);
};

// Log da configuração atual no console (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  const config = getTimezoneConfig();
  console.log('🌍 Configuração de Timezone:', {
    timezone: config.timezone,
    utcOffset: config.utcOffset,
    locale: config.locale,
    displayName: config.displayName
  });
}

export default {
  getTimezone,
  getTimezoneConfig,
  getTimezoneOffset,
  getLocale,
  getAvailableTimezones,
  isValidTimezone,
  applyTimezoneOffset
};
