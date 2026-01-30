import { toast } from '@/hooks/use-toast';

interface ApiError {
  message?: string;
  status?: number;
  code?: string;
}

export class ApiErrorHandler {
  private static readonly ERROR_MESSAGES: Record<number, string> = {
    400: 'Requisição inválida. Verifique os dados enviados.',
    401: 'Não autorizado. Por favor, faça login novamente.',
    403: 'Acesso negado. Você não tem permissão para esta ação.',
    404: 'Recurso não encontrado. Verifique se o serviço está disponível.',
    408: 'Tempo de requisição esgotado. Por favor, tente novamente.',
    429: 'Muitas requisições. Por favor, aguarde um momento.',
    500: 'Erro interno do servidor. Por favor, tente novamente mais tarde.',
    502: 'Erro no gateway. O servidor está temporariamente indisponível.',
    503: 'Serviço indisponível. Por favor, tente novamente mais tarde.',
    504: 'Tempo de resposta do servidor esgotado.'
  };

  static handleError(error: any, showToast = true): string {
    console.error('API Error:', error);

    let message = 'Ocorreu um erro inesperado. Por favor, tente novamente.';
    let status = 0;

    // Extract error information
    if (error.response) {
      // Server responded with error status
      status = error.response.status;
      message = error.response.data?.message ||
                error.response.data?.error ||
                this.ERROR_MESSAGES[status] ||
                message;
    } else if (error.request) {
      // Request was made but no response received
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Tempo de resposta esgotado. Verifique sua conexão e tente novamente.';
        status = 408;
      } else if (error.message?.includes('Network')) {
        message = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else {
        message = 'Não foi possível conectar ao servidor. Verifique se o serviço está disponível.';
        status = 503;
      }
    } else {
      // Something else happened
      message = error.message || message;
    }

    // Show toast notification if requested
    if (showToast) {
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }

    return message;
  }

  static isRetryableError(error: unknown): boolean {
    const status = error.response?.status || 0;
    const retryableStatuses = [408, 429, 502, 503, 504];

    return retryableStatuses.includes(status) ||
           error.code === 'ECONNABORTED' ||
           error.message?.includes('timeout') ||
           error.message?.includes('Network');
  }

  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || i === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Axios-like interceptor for fetch API
export function setupFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const [url, config] = args;

    // Add default timeout if not specified
    const controller = new AbortController();
    const timeout = (config as unknown)?.timeout || 300000; // 5 minutes default

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await originalFetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for 404 errors specifically
      if (response.status === 404) {
        // Log the URL for debugging
        console.error(`404 Not Found: ${url}`);

        // Check if it's a known problematic endpoint
        if (typeof url === 'string' && url.includes('/api/')) {
          ApiErrorHandler.handleError({
            response: {
              status: 404,
              data: {
                message: 'Endpoint não encontrado. Verifique se o backend está rodando corretamente.'
              }
            }
          });
        }
      }

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Tempo de requisição esgotado');
      }

      throw error;
    }
  };
}

// Setup interceptor on app initialization
if (typeof window !== 'undefined') {
  setupFetchInterceptor();
}

export default ApiErrorHandler;