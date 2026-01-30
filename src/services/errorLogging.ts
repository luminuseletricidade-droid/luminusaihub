import { supabase } from '@/integrations/supabase/client';

export interface ErrorLog {
  id?: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: unknown;
  user_id?: string;
  url: string;
  user_agent: string;
  session_id?: string;
  environment: string;
}

export class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private errorQueue: ErrorLog[] = [];
  private isOnline = navigator.onLine;
  private sessionId: string;
  private maxRetries = 3;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
    this.startQueueProcessor();
  }

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Generate unique session ID for tracking errors
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        context: { reason: event.reason }
      });
    });
  }

  /**
   * Start processing queued errors
   */
  private startQueueProcessor() {
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Process every 30 seconds
  }

  /**
   * Process error queue
   */
  private async processQueue() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errors) {
      await this.sendToBackend(error);
    }
  }

  /**
   * Send error to backend
   */
  private async sendToBackend(error: ErrorLog, retryCount = 0): Promise<void> {
    try {
      // Try to get current user
      const { data: { user } } = await supabase.auth.getUser();

      const errorWithUser = {
        ...error,
        user_id: user?.id || null
      };

      // Store in Supabase if table exists
      // For now, we'll just log to console in production
      if (process.env.NODE_ENV === 'production') {
        // In production, send to logging service
        console.log('Production error log:', errorWithUser);
      } else {
        console.error('Development error log:', errorWithUser);
      }

      // Store locally as backup
      this.storeLocally(errorWithUser);

    } catch (err) {
      console.error('Failed to send error log:', err);

      // Retry logic
      if (retryCount < this.maxRetries) {
        setTimeout(() => {
          this.sendToBackend(error, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        // If all retries fail, add back to queue
        this.errorQueue.push(error);
      }
    }
  }

  /**
   * Store error locally in localStorage
   */
  private storeLocally(error: ErrorLog) {
    try {
      const key = 'luminus_error_logs';
      const stored = localStorage.getItem(key);
      const logs = stored ? JSON.parse(stored) : [];

      logs.push(error);

      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  /**
   * Public method to log error
   */
  logError(error: {
    message: string;
    stack?: string;
    context?: unknown;
    level?: 'error' | 'warning' | 'info';
  }) {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: error.level || 'error',
      message: error.message,
      stack: error.stack,
      context: error.context,
      url: window.location.href,
      user_agent: navigator.userAgent,
      session_id: this.sessionId,
      environment: process.env.NODE_ENV || 'development'
    };

    if (this.isOnline) {
      this.sendToBackend(errorLog);
    } else {
      this.errorQueue.push(errorLog);
    }
  }

  /**
   * Log warning
   */
  logWarning(message: string, context?: unknown) {
    this.logError({ message, context, level: 'warning' });
  }

  /**
   * Log info
   */
  logInfo(message: string, context?: unknown) {
    this.logError({ message, context, level: 'info' });
  }

  /**
   * Get stored error logs
   */
  getStoredLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem('luminus_error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to retrieve stored logs:', e);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs() {
    try {
      localStorage.removeItem('luminus_error_logs');
      return true;
    } catch (e) {
      console.error('Failed to clear logs:', e);
      return false;
    }
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    const logs = this.getStoredLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luminus-error-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    const logs = this.getStoredLogs();
    const sessionLogs = logs.filter(log => log.session_id === this.sessionId);

    return {
      sessionId: this.sessionId,
      totalErrors: sessionLogs.filter(l => l.level === 'error').length,
      totalWarnings: sessionLogs.filter(l => l.level === 'warning').length,
      totalInfo: sessionLogs.filter(l => l.level === 'info').length,
      startTime: sessionLogs[0]?.timestamp,
      lastError: sessionLogs[sessionLogs.length - 1]?.timestamp,
      uniqueErrors: [...new Set(sessionLogs.map(l => l.message))].length
    };
  }
}

// Export singleton instance
export const errorLogger = ErrorLoggingService.getInstance();