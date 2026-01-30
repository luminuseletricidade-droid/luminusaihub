/**
 * Utilidades para manipulação de datas sem conversão de timezone
 *
 * IMPORTANTE: Todas as funções mantêm as datas no formato local configurado
 * O timezone padrão é America/Sao_Paulo (UTC-3), mas pode ser alterado via VITE_TIMEZONE
 *
 * Para configurar timezone diferente, adicione no .env:
 * VITE_TIMEZONE=America/Manaus (para UTC-4)
 * VITE_TIMEZONE=America/Rio_Branco (para UTC-5)
 * etc.
 *
 * @see /src/config/timezone.config.ts para lista completa de timezones suportados
 */

import { getTimezoneConfig } from '@/config/timezone.config';

/**
 * Converte string de data para o formato YYYY-MM-DD sem conversão de timezone
 * @param dateStr - Data em qualquer formato
 * @returns String no formato YYYY-MM-DD
 */
export const toISODateString = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '';

  try {
    if (typeof dateStr === 'string') {
      // Se já está no formato YYYY-MM-DD, retornar diretamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Se contém hora (YYYY-MM-DDTHH:mm), extrair apenas a data
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }

      // Se está no formato DD/MM/YYYY, converter para YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      }
    } else if (dateStr instanceof Date) {
      // Usar métodos locais para evitar conversão de timezone
      const year = dateStr.getFullYear();
      const month = String(dateStr.getMonth() + 1).padStart(2, '0');
      const day = String(dateStr.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  } catch (error) {
    console.error('Erro ao converter data para ISO:', error);
    return '';
  }
};

/**
 * Converte string de data para formato brasileiro (DD/MM/YYYY)
 * @param dateStr - Data no formato YYYY-MM-DD ou ISO
 * @returns String formatada como DD/MM/YYYY
 */
export const toBRDateString = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '';

  try {
    const isoDate = toISODateString(dateStr);
    if (!isoDate) return '';

    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao converter data para formato BR:', error);
    return '';
  }
};

/**
 * Normaliza uma data para o formato do input type="date" (YYYY-MM-DD)
 * Garante que a data seja sempre tratada como local, sem conversão de timezone
 * @param value - Data em qualquer formato
 * @returns String no formato YYYY-MM-DD ou vazio
 */
export const normalizeDateInput = (value: string | Date | null | undefined): string => {
  return toISODateString(value);
};

/**
 * Valida se uma string é uma data válida
 * @param dateStr - String de data para validar
 * @returns true se a data é válida
 */
export const isValidDate = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;

  try {
    const isoDate = toISODateString(dateStr);
    if (!isoDate) return false;

    const [year, month, day] = isoDate.split('-').map(Number);

    // Verificar se os valores são válidos
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Verificar se a data é válida no calendário
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  } catch {
    return false;
  }
};

/**
 * Adiciona dias a uma data sem conversão de timezone
 * @param dateStr - Data base no formato YYYY-MM-DD
 * @param days - Número de dias para adicionar (pode ser negativo)
 * @returns Nova data no formato YYYY-MM-DD
 */
export const addDays = (dateStr: string, days: number): string => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return toISODateString(date);
  } catch (error) {
    console.error('Erro ao adicionar dias:', error);
    return dateStr;
  }
};

/**
 * Calcula diferença em dias entre duas datas
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns Número de dias de diferença
 */
export const daysDifference = (date1: string, date2: string): number => {
  try {
    const iso1 = toISODateString(date1);
    const iso2 = toISODateString(date2);

    const [y1, m1, d1] = iso1.split('-').map(Number);
    const [y2, m2, d2] = iso2.split('-').map(Number);

    const d1Date = new Date(y1, m1 - 1, d1);
    const d2Date = new Date(y2, m2 - 1, d2);

    const diffTime = Math.abs(d2Date.getTime() - d1Date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Erro ao calcular diferença de dias:', error);
    return 0;
  }
};

/**
 * Obtém informações sobre o timezone configurado
 * @returns Objeto com informações do timezone
 */
export const getTimezoneInfo = () => {
  return getTimezoneConfig();
};

/**
 * Formata data e hora com informações de timezone
 * @param dateStr - Data para formatar
 * @returns String formatada com timezone (ex: "15/03/2025 14:30 (UTC-3)")
 */
export const formatDateWithTimezone = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '';

  try {
    const config = getTimezoneConfig();
    const formatted = toBRDateString(dateStr);

    if (!formatted) return '';

    const offsetSign = config.utcOffset >= 0 ? '+' : '';
    return `${formatted} (UTC${offsetSign}${config.utcOffset})`;
  } catch (error) {
    console.error('Erro ao formatar data com timezone:', error);
    return '';
  }
};
