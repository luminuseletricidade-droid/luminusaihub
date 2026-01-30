import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDateTime = (date: string, time: string): string => {
  // Garante que a data e hora sejam tratadas como locais, sem conversão de timezone
  const localDateTime = `${date}T${time}:00`;
  return localDateTime;
};

export const parseDateTime = (dateTimeStr: string): { date: string; time: string } => {
  if (!dateTimeStr) {
    return { date: '', time: '09:00' };
  }

  try {
    // Se for uma string ISO completa com timezone
    if (dateTimeStr.includes('Z') || dateTimeStr.includes('+') || dateTimeStr.includes('-')) {
      const dateObj = parseISO(dateTimeStr);
      return {
        date: format(dateObj, 'yyyy-MM-dd'),
        time: format(dateObj, 'HH:mm')
      };
    }

    // Se for datetime local (sem timezone)
    const [datePart, timePart] = dateTimeStr.split('T');
    const time = timePart ? timePart.substring(0, 5) : '09:00';

    return {
      date: datePart,
      time: time
    };
  } catch (error) {
    console.error('Erro ao fazer parse de data/hora:', error);
    return { date: '', time: '09:00' };
  }
};

export const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return 'Não definida';

  try {
    const date = parseISO(dateStr);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return 'Data inválida';
  }
};

export const formatTimeForDisplay = (timeStr: string): string => {
  if (!timeStr) return '09:00';

  // Remove segundos se presentes
  return timeStr.substring(0, 5);
};

// Função para garantir que o horário seja salvo sem conversão de timezone
export const prepareMaintenanceDateTime = (date: string, time: string): {
  scheduled_date: string;
  scheduled_time: string;
} => {
  return {
    scheduled_date: date,
    scheduled_time: time
  };
};