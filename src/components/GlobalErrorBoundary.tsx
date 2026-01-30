import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Mail, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
  lastErrorTime?: Date;
  isNetworkError: boolean;
  isRecoveringFromNetwork: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorRecoveryAttempts = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorCount: 0,
      isNetworkError: false,
      isRecoveringFromNetwork: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const networkError = this.isNetworkError(error);
    console.error('Global Error Boundary capturou erro:', error, errorInfo, { isNetwork: networkError });

    // Log error to localStorage for debugging
    this.logErrorToStorage(error, errorInfo);

    // Notify parent if handler provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      isNetworkError: networkError,
      isRecoveringFromNetwork: networkError
    }));

    // Auto-recovery attempt for network errors - silently recover without blocking UI
    if (networkError) {
      this.attemptSilentNetworkRecovery();
    }
  }

  private attemptSilentNetworkRecovery = () => {
    // Listen for network reconnection
    const handleOnline = () => {
      console.log('🔄 [GlobalErrorBoundary] Conexão restaurada, limpando estado de erro...');
      window.removeEventListener('online', handleOnline);
      this.errorRecoveryAttempts = 0;
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isNetworkError: false,
        isRecoveringFromNetwork: false
      });
    };

    // If already online, retry after short delay
    if (navigator.onLine) {
      setTimeout(() => {
        if (this.errorRecoveryAttempts < this.MAX_RECOVERY_ATTEMPTS) {
          this.errorRecoveryAttempts++;
          console.log(`🔄 [GlobalErrorBoundary] Tentativa de recovery ${this.errorRecoveryAttempts}/${this.MAX_RECOVERY_ATTEMPTS}`);
          this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            isNetworkError: false,
            isRecoveringFromNetwork: false
          });
        }
      }, 2000 * (this.errorRecoveryAttempts + 1));
    } else {
      // Wait for network to come back
      window.addEventListener('online', handleOnline);
    }
  };

  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name?.toLowerCase() || '';

    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('failed to fetch') ||
           message.includes('load') ||
           message.includes('timeout') ||
           message.includes('conexão') ||
           message.includes('connection') ||
           message.includes('offline') ||
           message.includes('internet') ||
           message.includes('econnrefused') ||
           message.includes('enotfound') ||
           message.includes('404') ||
           name.includes('networkerror') ||
           name.includes('typeerror') && message.includes('fetch') ||
           !navigator.onLine;
  }

  private attemptAutoRecovery = () => {
    this.errorRecoveryAttempts++;
    setTimeout(() => {
      console.log(`Tentativa de recuperação automática ${this.errorRecoveryAttempts}/${this.MAX_RECOVERY_ATTEMPTS}`);
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }, 2000 * this.errorRecoveryAttempts);
  };

  private logErrorToStorage = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      const existingLogs = localStorage.getItem('luminus_error_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);

      // Keep only last 30 errors
      if (logs.length > 30) {
        logs.splice(0, logs.length - 30);
      }

      localStorage.setItem('luminus_error_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Falha ao salvar log de erro:', e);
    }
  };

  private clearErrorLogs = () => {
    try {
      localStorage.removeItem('luminus_error_logs');
      alert('Logs de erro limpos com sucesso!');
    } catch (e) {
      console.error('Falha ao limpar logs:', e);
    }
  };

  private downloadErrorLogs = () => {
    try {
      const logs = localStorage.getItem('luminus_error_logs') || '[]';
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luminus-error-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Falha ao baixar logs:', e);
    }
  };

  private handleReset = () => {
    this.errorRecoveryAttempts = 0;
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    // For network errors, don't block the UI - let the app continue
    // The NetworkStatusBanner component will inform users about connectivity
    if (this.state.hasError && this.state.isNetworkError) {
      console.log('🌐 [GlobalErrorBoundary] Erro de rede detectado, permitindo UI continuar...');
      return this.props.children;
    }

    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isNetworkError = this.state.error && this.isNetworkError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader className="text-center bg-red-100 border-b border-red-200">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-800">
                Ops! Algo deu errado
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {isNetworkError
                    ? 'Parece que você está com problemas de conexão. Verifique sua internet e tente novamente.'
                    : 'Ocorreu um erro inesperado ao processar sua solicitação. Nossa equipe foi notificada.'}
                </AlertDescription>
              </Alert>

              {/* Error details for development */}
              {isDevelopment && this.state.error && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">
                      Detalhes do Erro (Desenvolvimento):
                    </h3>
                    <p className="text-red-600 font-mono text-sm break-all">
                      {this.state.error.message}
                    </p>
                  </div>

                  {this.state.error.stack && (
                    <details className="cursor-pointer">
                      <summary className="font-semibold text-gray-700 hover:text-gray-900">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto text-xs">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <details className="cursor-pointer">
                      <summary className="font-semibold text-gray-700 hover:text-gray-900">
                        Component Stack
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* User guidance */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">
                  O que você pode fazer:
                </h4>
                <ul className="list-disc list-inside text-blue-800 space-y-1">
                  <li>Tente recarregar a página</li>
                  <li>Volte para a página inicial</li>
                  <li>Verifique sua conexão com a internet</li>
                  <li>Entre em contato com o suporte se o problema persistir</li>
                </ul>
              </div>

              {/* Error count indicator */}
              {this.state.errorCount > 1 && (
                <div className="text-center text-sm text-gray-600">
                  Este erro ocorreu {this.state.errorCount} vezes
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 bg-gray-50 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Página Inicial
                </Button>

                {this.state.errorCount <= 3 && (
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tentar Novamente
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar Página
                </Button>

                <Button
                  onClick={() => window.location.href = 'mailto:suporte@luminus.ai'}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Suporte
                </Button>

                {isDevelopment && (
                  <Button
                    onClick={this.downloadErrorLogs}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <History className="h-3 w-3" />
                    Logs
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;