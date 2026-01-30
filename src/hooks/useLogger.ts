import { useCallback, useRef } from 'react';
import { logger, LogLevel } from '@/lib/logger';

interface UseLoggerOptions {
  component?: string;
  enablePerformanceLogging?: boolean;
}

export const useLogger = (options: UseLoggerOptions = {}) => {
  const { component, enablePerformanceLogging = false } = options;
  const performanceTimers = useRef<Map<string, number>>(new Map());

  const log = useCallback((
    level: LogLevel,
    message: string,
    context?: unknown,
    action?: string
  ) => {
    switch (level) {
      case 'debug':
        logger.debug(message, context, component, action);
        break;
      case 'info':
        logger.info(message, context, component, action);
        break;
      case 'warn':
        logger.warn(message, context, component, action);
        break;
      case 'error':
        logger.error(message, context, component, action);
        break;
    }
  }, [component]);

  const debug = useCallback((message: string, context?: unknown, action?: string) => {
    logger.debug(message, context, component, action);
  }, [component]);

  const info = useCallback((message: string, context?: unknown, action?: string) => {
    logger.info(message, context, component, action);
  }, [component]);

  const warn = useCallback((message: string, context?: unknown, action?: string) => {
    logger.warn(message, context, component, action);
  }, [component]);

  const error = useCallback((message: string, context?: unknown, action?: string) => {
    logger.error(message, context, component, action);
  }, [component]);

  const logAction = useCallback((action: string, message: string, context?: unknown) => {
    logger.logComponent(component || 'Unknown', action, message, context);
  }, [component]);

  const logApiCall = useCallback((endpoint: string, method: string, status?: number, duration?: number) => {
    logger.logApiCall(endpoint, method, status, duration);
  }, []);

  const logUserAction = useCallback((action: string, context?: unknown) => {
    logger.logUserAction(action, context);
  }, []);

  const startPerformanceTimer = useCallback((operation: string) => {
    if (enablePerformanceLogging) {
      performanceTimers.current.set(operation, performance.now());
    }
  }, [enablePerformanceLogging]);

  const endPerformanceTimer = useCallback((operation: string, context?: unknown) => {
    if (enablePerformanceLogging) {
      const startTime = performanceTimers.current.get(operation);
      if (startTime) {
        const duration = performance.now() - startTime;
        logger.logPerformance(operation, duration, context);
        performanceTimers.current.delete(operation);
      }
    }
  }, [enablePerformanceLogging]);

  const logPerformance = useCallback((operation: string, duration: number, context?: unknown) => {
    if (enablePerformanceLogging) {
      logger.logPerformance(operation, duration, context);
    }
  }, [enablePerformanceLogging]);

  return {
    log,
    debug,
    info,
    warn,
    error,
    logAction,
    logApiCall,
    logUserAction,
    startPerformanceTimer,
    endPerformanceTimer,
    logPerformance
  };
};

// Hook específico para componentes
export const useComponentLogger = (componentName: string, enablePerformanceLogging = false) => {
  return useLogger({ component: componentName, enablePerformanceLogging });
};

// Hook para logging de API calls
export const useApiLogger = () => {
  const logApiCall = useCallback((endpoint: string, method: string, status?: number, duration?: number) => {
    logger.logApiCall(endpoint, method, status, duration);
  }, []);

  return { logApiCall };
};

// Hook para logging de performance
export const usePerformanceLogger = () => {
  const performanceTimers = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((operation: string) => {
    performanceTimers.current.set(operation, performance.now());
  }, []);

  const endTimer = useCallback((operation: string, context?: unknown) => {
    const startTime = performanceTimers.current.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      logger.logPerformance(operation, duration, context);
      performanceTimers.current.delete(operation);
      return duration;
    }
    return 0;
  }, []);

  const logPerformance = useCallback((operation: string, duration: number, context?: unknown) => {
    logger.logPerformance(operation, duration, context);
  }, []);

  return {
    startTimer,
    endTimer,
    logPerformance
  };
};
