import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, FileX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ContractErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Contract Error Boundary caught an error:', error, errorInfo);

    // Log to monitoring service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
        error: {
          message: error.message,
          stack: error.stack,
          component: 'ContractErrorBoundary'
        }
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ContractErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ContractErrorFallbackProps {
  error?: Error;
  onReset: () => void;
}

export function ContractErrorFallback({ error, onReset }: ContractErrorFallbackProps) {
  const navigate = useNavigate();

  const isNotFoundError = error?.message?.includes('404') || error?.message?.includes('NOT_FOUND');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isNotFoundError ? (
              <FileX className="h-12 w-12 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {isNotFoundError
              ? 'Página de Contratos Não Encontrada'
              : 'Erro ao Carregar Contratos'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {isNotFoundError
              ? 'A página de contratos que você está procurando não pôde ser encontrada. Isso pode ter ocorrido devido a um erro de configuração ou a página pode ter sido movida.'
              : 'Ocorreu um erro ao carregar a página de contratos. Por favor, tente novamente.'}
          </p>

          {error && !isNotFoundError && (
            <details className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onReset}
              className="flex items-center gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button
              onClick={() => navigate('/app/dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Ir para Dashboard
            </Button>
          </div>

          {isNotFoundError && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Possíveis soluções:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                <li>Verifique se você está logado corretamente</li>
                <li>Limpe o cache do navegador (Ctrl+F5)</li>
                <li>Tente acessar pelo menu lateral</li>
                <li>Entre em contato com o suporte se o problema persistir</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ContractErrorBoundary;