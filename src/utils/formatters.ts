
/**
 * Formata data para DD/MM/YYYY SEM conversão de timezone
 * Use esta função em vez de new Date().toLocaleDateString()
 */
export const formatDateSafe = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';

  try {
    let dateStr: string;

    // Se for string
    if (typeof dateInput === 'string') {
      // Extrair apenas YYYY-MM-DD
      dateStr = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
    } else {
      // Se for Date object, converter para YYYY-MM-DD usando UTC
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    // Reformatar para DD/MM/YYYY (manipulação pura de strings)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    return dateStr;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formata data sem conversão de timezone
 * Mantém a data exatamente como está no formato YYYY-MM-DD
 * @param date - String no formato ISO (YYYY-MM-DD) ou objeto Date
 * @returns String formatada no padrão brasileiro (DD/MM/YYYY)
 *
 * IMPORTANTE: Esta função NUNCA deve criar objetos Date para evitar problemas de timezone.
 * Trata tudo como manipulação de strings puras.
 */
export const formatDate = (date: string | Date): string => {
  console.log('🔥 [formatDate] INÍCIO - Input bruto:', date, 'Tipo:', typeof date);

  if (!date) {
    console.log('❌ [formatDate] Input vazio/null');
    return '';
  }

  try {
    // Converter para string se for objeto Date
    let inputStr: string;
    if (typeof date === 'object' && date !== null) {
      inputStr = date.toISOString();
      console.log('🔄 [formatDate] Convertido Date para ISO:', inputStr);
    } else {
      inputStr = String(date);
      console.log('📝 [formatDate] Já é string:', inputStr);
    }

    // Extrair apenas a parte da data (YYYY-MM-DD)
    let dateStr: string;
    if (inputStr.length === 10 && inputStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateStr = inputStr;
      console.log('✅ [formatDate] Formato YYYY-MM-DD direto:', dateStr);
    } else if (inputStr.includes('T')) {
      dateStr = inputStr.split('T')[0];
      console.log('✂️ [formatDate] Extraído de timestamp:', dateStr);
    } else {
      console.error('⚠️ [formatDate] Formato não reconhecido:', inputStr);
      return '';
    }

    // Validar formato final
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error('❌ [formatDate] Formato inválido após processamento:', dateStr);
      return '';
    }

    // Dividir em partes (manipulação pura de strings, SEM Date objects)
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    console.log('🔢 [formatDate] Partes:', { year, month, day });

    // Montar formato brasileiro
    const formatted = `${day}/${month}/${year}`;

    console.log('✨ [formatDate] RESULTADO FINAL:', formatted);
    console.log('================================================');

    return formatted;
  } catch (error) {
    console.error('💥 [formatDate] ERRO:', error, 'Input original:', date);
    return '';
  }
};

/**
 * Formata data e hora sem conversão de timezone
 * Mantém data e hora exatamente como estão no formato ISO
 * @param date - String no formato ISO ou objeto Date
 * @returns String formatada no padrão brasileiro (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';

  try {
    let dateStr: string;
    let timeStr: string = '00:00';

    if (typeof date === 'string') {
      const parts = date.split('T');
      dateStr = parts[0];
      if (parts[1]) {
        timeStr = parts[1].substring(0, 5); // HH:mm
      }
    } else {
      // Formatar Date object sem conversão de timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
      timeStr = `${hours}:${minutes}`;
    }

    // Dividir e reformatar para DD/MM/YYYY HH:mm
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year} ${timeStr}`;
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return '';
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const generateContractNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CONT-${timestamp}-${random}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
