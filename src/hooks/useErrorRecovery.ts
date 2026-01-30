import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage, createToastFromError } from '@/utils/errorMessages';
import { errorLogger } from '@/services/errorLogging';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: unknown) => void;
  onRecovery?: () => void;
  enableAutoRecovery?: boolean;
  showToast?: boolean;
}

interface ErrorRecoveryState {
  isRecovering: boolean;
  retryCount: number;
  lastError: any | null;
  hasRecovered: boolean;
}

/**
 * Hook for automatic error recovery with retry logic
 */
export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRecovery,
    enableAutoRecovery = true,
    showToast = true
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isRecovering: false,
    retryCount: 0,
    lastError: null,
    hasRecovered: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  /**
   * Clear retry timeout
   */
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle error with recovery logic
   */
  const handleError = useCallback(async (
    error: any,
    retryFn?: () => Promise<unknown>
  ) => {
    // Log error
    errorLogger.logError({
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: { retryCount: state.retryCount }
    });

    setState(prev => ({
      ...prev,
      lastError: error,
      isRecovering: enableAutoRecovery
    }));

    // Call error callback
    if (onError) {
      onError(error);
    }

    // Show toast notification
    if (showToast) {
      const toastMessage = createToastFromError(error);
      toast(toastMessage);
    }

    // Attempt auto-recovery if enabled and retry function provided
    if (enableAutoRecovery && retryFn && state.retryCount < maxRetries) {
      retryTimeoutRef.current = setTimeout(async () => {
        try {
          setState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1,
            isRecovering: true
          }));

          await retryFn();

          // Success - reset state
          setState({
            isRecovering: false,
            retryCount: 0,
            lastError: null,
            hasRecovered: true
          });

          if (onRecovery) {
            onRecovery();
          }

          if (showToast) {
            toast({
              title: 'Recuperado com sucesso',
              description: 'A operação foi concluída após nova tentativa.'
            });
          }
        } catch (retryError) {
          // Recursive retry with exponential backoff
          const nextDelay = retryDelay * Math.pow(2, state.retryCount);
          handleError(retryError, retryFn);
        }
      }, retryDelay * Math.pow(2, state.retryCount));
    } else if (state.retryCount >= maxRetries) {
      setState(prev => ({ ...prev, isRecovering: false }));

      // Max retries reached - show final error
      if (showToast) {
        toast({
          title: 'Erro persistente',
          description: 'Não foi possível completar a operação após múltiplas tentativas.',
          variant: 'destructive'
        });
      }
    }
  }, [
    state.retryCount,
    maxRetries,
    retryDelay,
    enableAutoRecovery,
    onError,
    onRecovery,
    showToast
  ]);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setState({
      isRecovering: false,
      retryCount: 0,
      lastError: null,
      hasRecovered: false
    });
  }, []);

  /**
   * Execute function with error recovery
   */
  const executeWithRecovery = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T | undefined> => {
    try {
      const result = await fn();

      // Reset state on success
      if (state.retryCount > 0) {
        setState({
          isRecovering: false,
          retryCount: 0,
          lastError: null,
          hasRecovered: true
        });
      }

      return result;
    } catch (error) {
      await handleError(error, fn);
      return undefined;
    }
  }, [handleError, state.retryCount]);

  /**
   * Network error recovery
   */
  const handleNetworkError = useCallback((error: unknown) => {
    const isNetworkError =
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('fetch') ||
      !navigator.onLine;

    if (isNetworkError) {
      // Listen for network recovery
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);

        if (showToast) {
          toast({
            title: 'Conexão restaurada',
            description: 'Você está online novamente.'
          });
        }

        if (onRecovery) {
          onRecovery();
        }

        setState(prev => ({ ...prev, hasRecovered: true }));
      };

      window.addEventListener('online', handleOnline);

      if (showToast) {
        toast({
          title: 'Sem conexão',
          description: 'Aguardando conexão com a internet...',
          variant: 'destructive'
        });
      }
    }
  }, [showToast, onRecovery]);

  /**
   * Auth error recovery - redirect to login
   */
  const handleAuthError = useCallback((error: unknown) => {
    const isAuthError =
      error.status === 401 ||
      error.message?.toLowerCase().includes('auth') ||
      error.message?.toLowerCase().includes('unauthorized');

    if (isAuthError) {
      if (showToast) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive'
        });
      }

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [navigate, showToast]);

  /**
   * Create wrapped async function with error recovery
   */
  const wrapAsync = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      return executeWithRecovery(() => fn(...args));
    };
  }, [executeWithRecovery]);

  return {
    ...state,
    handleError,
    resetError,
    executeWithRecovery,
    handleNetworkError,
    handleAuthError,
    wrapAsync
  };
}

