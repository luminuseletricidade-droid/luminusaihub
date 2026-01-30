/**
 * Utilitários para trabalhar com dias úteis (Segunda a Sexta)
 */

/**
 * Verifica se uma data é um dia útil (Segunda a Sexta)
 */
export const isBusinessDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda (1) a Sexta (5)
};

/**
 * Encontra o próximo dia útil a partir de uma data
 * Se a data já for um dia útil, retorna ela mesma
 */
export const getNextBusinessDay = (date: Date): Date => {
  const newDate = new Date(date);
  
  while (!isBusinessDay(newDate)) {
    newDate.setDate(newDate.getDate() + 1);
  }
  
  return newDate;
};

/**
 * Encontra o dia útil anterior a partir de uma data
 * Se a data já for um dia útil, retorna ela mesma
 */
export const getPreviousBusinessDay = (date: Date): Date => {
  const newDate = new Date(date);
  
  while (!isBusinessDay(newDate)) {
    newDate.setDate(newDate.getDate() - 1);
  }
  
  return newDate;
};

/**
 * Ajusta uma data para o próximo dia útil se ela cair em fim de semana
 */
export const adjustToBusinessDay = (date: Date): Date => {
  if (isBusinessDay(date)) {
    return new Date(date);
  }
  
  return getNextBusinessDay(date);
};

/**
 * Calcula quantos dias úteis existem entre duas datas (exclusivo)
 */
export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current < end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Adiciona um número específico de dias úteis a uma data
 */
export const addBusinessDays = (date: Date, businessDays: number): Date => {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      daysAdded++;
    }
  }
  
  return result;
};

/**
 * Gera uma lista de datas de manutenção considerando apenas dias úteis
 */
export const generateMaintenanceDates = (
  startDate: Date,
  frequency: 'monthly' | 'biweekly' | 'weekly',
  count: number
): Date[] => {
  const dates: Date[] = [];
  let currentDate = adjustToBusinessDay(new Date(startDate));
  
  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentDate));
    
    // Calcular próxima data baseada na frequência
    switch (frequency) {
      case 'monthly':
        // Adicionar 1 mês e ajustar para dia útil
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate = adjustToBusinessDay(currentDate);
        break;
        
      case 'biweekly':
        // Adicionar 14 dias úteis
        currentDate = addBusinessDays(currentDate, 14);
        break;
        
      case 'weekly':
        // Adicionar 7 dias úteis
        currentDate = addBusinessDays(currentDate, 7);
        break;
    }
  }
  
  return dates;
};

/**
 * Formata uma data para exibição com indicação se é dia útil
 */
export const formatDateWithBusinessDay = (date: Date, locale: string = 'pt-BR'): string => {
  const formatted = date.toLocaleDateString(locale);
  const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
  const isWorkDay = isBusinessDay(date);

  return `${formatted} (${dayName})${isWorkDay ? '' : ' - FIM DE SEMANA'}`;
};

/**
 * Função para usar com react-day-picker para desabilitar fins de semana
 * Retorna true se a data deve ser desabilitada (sábado ou domingo)
 */
export const disableWeekends = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sábado (6) ou Domingo (0)
};