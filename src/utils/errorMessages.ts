/**
 * Centralized error messages in Portuguese for the entire application
 */

export interface ErrorMessage {
  title: string;
  description: string;
  actions?: string[];
}

// Common error types with user-friendly messages in Portuguese
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Erro de Conexão',
    description: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
    actions: [
      'Verifique sua conexão com a internet',
      'Tente novamente em alguns instantes',
      'Entre em contato com o suporte se o problema persistir'
    ]
  },

  TIMEOUT_ERROR: {
    title: 'Tempo Esgotado',
    description: 'A operação demorou mais que o esperado. O servidor pode estar sobrecarregado.',
    actions: [
      'Aguarde alguns instantes e tente novamente',
      'Verifique se sua conexão está estável',
      'Tente realizar a operação fora do horário de pico'
    ]
  },

  // Authentication errors
  AUTH_ERROR: {
    title: 'Erro de Autenticação',
    description: 'Sua sessão expirou ou você não tem permissão para acessar este recurso.',
    actions: [
      'Faça login novamente',
      'Verifique suas credenciais',
      'Entre em contato com o administrador se precisar de acesso'
    ]
  },

  UNAUTHORIZED: {
    title: 'Acesso Negado',
    description: 'Você não tem permissão para realizar esta ação.',
    actions: [
      'Verifique se você tem as permissões necessárias',
      'Entre em contato com o administrador do sistema'
    ]
  },

  // Data errors
  VALIDATION_ERROR: {
    title: 'Dados Inválidos',
    description: 'Os dados fornecidos não são válidos. Verifique as informações e tente novamente.',
    actions: [
      'Revise os campos do formulário',
      'Verifique se todos os campos obrigatórios foram preenchidos',
      'Certifique-se de que os dados estão no formato correto'
    ]
  },

  NOT_FOUND: {
    title: 'Não Encontrado',
    description: 'O recurso que você está procurando não foi encontrado.',
    actions: [
      'Verifique se o endereço está correto',
      'O item pode ter sido removido ou movido',
      'Volte para a página inicial'
    ]
  },

  // File errors
  FILE_UPLOAD_ERROR: {
    title: 'Erro no Upload',
    description: 'Não foi possível enviar o arquivo. Verifique o tamanho e formato.',
    actions: [
      'Verifique se o arquivo não excede 10MB',
      'Formatos aceitos: PDF, PNG, JPG',
      'Tente com um arquivo diferente'
    ]
  },

  PDF_EXTRACTION_ERROR: {
    title: 'Erro ao Processar PDF',
    description: 'Não foi possível extrair informações do PDF.',
    actions: [
      'Verifique se o PDF não está corrompido',
      'Tente com um PDF diferente',
      'O PDF pode estar protegido ou em formato não suportado'
    ]
  },

  // Database errors
  DATABASE_ERROR: {
    title: 'Erro no Banco de Dados',
    description: 'Ocorreu um erro ao acessar os dados. Tente novamente.',
    actions: [
      'Aguarde alguns instantes',
      'Atualize a página',
      'Entre em contato com o suporte técnico'
    ]
  },

  DUPLICATE_ERROR: {
    title: 'Registro Duplicado',
    description: 'Já existe um registro com essas informações.',
    actions: [
      'Verifique se o registro já existe',
      'Use informações diferentes',
      'Atualize o registro existente'
    ]
  },

  // AI/Processing errors
  AI_PROCESSING_ERROR: {
    title: 'Erro no Processamento com IA',
    description: 'O sistema de inteligência artificial não conseguiu processar sua solicitação.',
    actions: [
      'Tente simplificar sua solicitação',
      'Aguarde alguns instantes e tente novamente',
      'Use o processamento manual como alternativa'
    ]
  },

  QUOTA_EXCEEDED: {
    title: 'Limite Excedido',
    description: 'Você atingiu o limite de operações permitidas.',
    actions: [
      'Aguarde até o próximo período',
      'Entre em contato para aumentar seu limite',
      'Considere fazer upgrade do plano'
    ]
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Erro Desconhecido',
    description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
    actions: [
      'Tente novamente',
      'Atualize a página',
      'Entre em contato com o suporte se persistir'
    ]
  },

  MAINTENANCE: {
    title: 'Sistema em Manutenção',
    description: 'Estamos realizando melhorias no sistema. Voltaremos em breve.',
    actions: [
      'Tente novamente em alguns minutos',
      'Acompanhe nossas atualizações',
      'Entre em contato para informações urgentes'
    ]
  }
};

/**
 * Get error message based on error type or status code
 */
export function getErrorMessage(error: unknown): ErrorMessage {
  // Check for specific error types
  if (error?.message?.toLowerCase().includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (error?.message?.toLowerCase().includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }

  if (error?.message?.toLowerCase().includes('auth') || error?.status === 401) {
    return ERROR_MESSAGES.AUTH_ERROR;
  }

  if (error?.status === 403) {
    return ERROR_MESSAGES.UNAUTHORIZED;
  }

  if (error?.status === 404) {
    return ERROR_MESSAGES.NOT_FOUND;
  }

  if (error?.status === 422 || error?.message?.toLowerCase().includes('validation')) {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }

  if (error?.message?.toLowerCase().includes('duplicate') || error?.code === '23505') {
    return ERROR_MESSAGES.DUPLICATE_ERROR;
  }

  if (error?.message?.toLowerCase().includes('pdf')) {
    return ERROR_MESSAGES.PDF_EXTRACTION_ERROR;
  }

  if (error?.message?.toLowerCase().includes('upload')) {
    return ERROR_MESSAGES.FILE_UPLOAD_ERROR;
  }

  if (error?.message?.toLowerCase().includes('database') || error?.code?.startsWith('P')) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }

  if (error?.message?.toLowerCase().includes('ai') || error?.message?.toLowerCase().includes('gpt')) {
    return ERROR_MESSAGES.AI_PROCESSING_ERROR;
  }

  if (error?.status === 429 || error?.message?.toLowerCase().includes('quota')) {
    return ERROR_MESSAGES.QUOTA_EXCEEDED;
  }

  if (error?.status === 503) {
    return ERROR_MESSAGES.MAINTENANCE;
  }

  // Default to unknown error
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Format error for display with fallback to default message
 */
export function formatErrorForDisplay(error: unknown): string {
  const errorMessage = getErrorMessage(error);
  return `${errorMessage.title}: ${errorMessage.description}`;
}

/**
 * Log error with context for debugging
 */
export function logError(error: any, context?: string) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      code: error?.code,
      type: error?.type || error?.name
    },
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
  }

  // Store in localStorage for debugging
  try {
    const logs = JSON.parse(localStorage.getItem('luminus_error_logs') || '[]');
    logs.push(errorInfo);

    // Keep only last 30 logs
    if (logs.length > 30) {
      logs.splice(0, logs.length - 30);
    }

    localStorage.setItem('luminus_error_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to log error:', e);
  }

  // In production, this would send to a logging service
  // Example: Sentry, LogRocket, etc.
}

/**
 * Create a user-friendly toast message from error
 */
export function createToastFromError(error: unknown) {
  const errorMessage = getErrorMessage(error);
  return {
    title: errorMessage.title,
    description: errorMessage.description,
    variant: 'destructive' as const
  };
}