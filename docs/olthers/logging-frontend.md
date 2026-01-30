# Sistema de Logging Frontend

Este documento explica como usar o sistema de logging implementado no frontend da aplicação Luminus AI Hub.

## Configuração

### Variáveis de Ambiente

Configure as seguintes variáveis no seu arquivo `.env.local`:

```bash
# Ativar debug mode
VITE_ENABLE_DEBUG=true

# Nível de logging (debug, info, warn, error)
VITE_LOG_LEVEL=debug

# Destinos de logging
VITE_LOG_TO_CONSOLE=true    # Mostrar logs no console do navegador
VITE_LOG_TO_STORAGE=true    # Armazenar logs no localStorage
VITE_LOG_TO_BACKEND=false   # Enviar logs para o backend
```

### Níveis de Logging

- **debug**: Todos os logs (mais verboso)
- **info**: Logs de informação, avisos e erros
- **warn**: Apenas avisos e erros
- **error**: Apenas erros (menos verboso)

## Uso Básico

### Importar o Logger

```typescript
import { logger } from '@/lib/logger';
```

### Logging Simples

```typescript
// Logs básicos
logger.debug('Mensagem de debug');
logger.info('Informação importante');
logger.warn('Aviso sobre algo');
logger.error('Erro ocorreu');
```

### Logging com Contexto

```typescript
logger.info('Usuário fez login', {
  userId: '123',
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});
```

### Logging com Componente e Ação

```typescript
logger.info('Botão clicado', { buttonId: 'save' }, 'UserProfile', 'click');
```

## Hooks React

### useLogger Hook

```typescript
import { useLogger } from '@/hooks/useLogger';

const MyComponent = () => {
  const { info, error, logAction } = useLogger({ 
    component: 'MyComponent',
    enablePerformanceLogging: true 
  });

  const handleClick = () => {
    logAction('button_click', 'Usuário clicou no botão', { buttonId: 'save' });
  };

  return <button onClick={handleClick}>Save</button>;
};
```

### useComponentLogger Hook

```typescript
import { useComponentLogger } from '@/hooks/useLogger';

const UserProfile = () => {
  const { info, error, startPerformanceTimer, endPerformanceTimer } = 
    useComponentLogger('UserProfile', true);

  const loadUserData = async () => {
    startPerformanceTimer('loadUserData');
    try {
      // ... carregar dados
      info('Dados do usuário carregados com sucesso');
    } catch (err) {
      error('Erro ao carregar dados do usuário', { error: err });
    } finally {
      endPerformanceTimer('loadUserData');
    }
  };
};
```

### usePerformanceLogger Hook

```typescript
import { usePerformanceLogger } from '@/hooks/useLogger';

const DataTable = () => {
  const { startTimer, endTimer } = usePerformanceLogger();

  const sortData = (column: string) => {
    startTimer('sortData');
    // ... lógica de ordenação
    endTimer('sortData', { column, rowCount: data.length });
  };
};
```

## Logging Automático

### API Calls

O serviço de API já está configurado para fazer logging automático de todas as requisições:

```typescript
// Logs automáticos incluem:
// - Request iniciado
// - Response recebido
// - Erros de rede
// - Tempo de resposta
// - Status codes
```

### Erros Globais

O sistema captura automaticamente:
- Erros JavaScript não tratados
- Rejeições de Promise não tratadas
- Erros de rede

## Visualização de Logs

### Console do Navegador

Os logs aparecem no console com formato estruturado:

```
[2024-01-15T10:30:00.000Z] [INFO] [API] [request]: API Request: GET /api/contracts
```

### Log Viewer Component

Use o componente `LogViewer` para visualizar logs em uma interface:

```typescript
import LogViewer from '@/components/LogViewer';

const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);

<LogViewer 
  isOpen={isLogViewerOpen} 
  onClose={() => setIsLogViewerOpen(false)} 
/>
```

### Debug Panel

O `DebugPanel` fornece uma interface completa para:
- Visualizar estatísticas de logs
- Exportar logs
- Limpar logs
- Testar o sistema de logging

## Funcionalidades Avançadas

### Exportar Logs

```typescript
// Exportar logs para arquivo JSON
logger.exportLogs();
```

### Limpar Logs

```typescript
// Limpar logs armazenados
logger.clearStoredLogs();
```

### Analytics de Sessão

```typescript
const analytics = logger.getSessionAnalytics();
console.log(analytics);
// {
//   sessionId: "session_1234567890_abc123",
//   totalLogs: 150,
//   debug: 50,
//   info: 80,
//   warn: 15,
//   error: 5,
//   startTime: "2024-01-15T10:00:00.000Z",
//   lastLog: "2024-01-15T10:30:00.000Z",
//   uniqueMessages: 45
// }
```

### Acesso Global (Desenvolvimento)

Em modo de desenvolvimento, o logger fica disponível globalmente:

```javascript
// No console do navegador
window.logger.debug('Teste global');
window.logInfo('Teste info global');
```

## Exemplos Práticos

### Logging em Componente de Formulário

```typescript
import { useComponentLogger } from '@/hooks/useLogger';

const ContractForm = () => {
  const { info, error, logAction } = useComponentLogger('ContractForm');

  const handleSubmit = async (data: ContractData) => {
    logAction('form_submit', 'Iniciando envio do formulário', { 
      contractType: data.type 
    });

    try {
      await submitContract(data);
      info('Contrato enviado com sucesso', { contractId: data.id });
    } catch (err) {
      error('Erro ao enviar contrato', { 
        error: err.message,
        contractData: data 
      });
    }
  };
};
```

### Logging de Performance

```typescript
import { usePerformanceLogger } from '@/hooks/usePerformanceLogger';

const DataVisualization = () => {
  const { startTimer, endTimer } = usePerformanceLogger();

  const renderChart = (data: ChartData[]) => {
    startTimer('chartRender');
    
    // ... lógica de renderização
    
    endTimer('chartRender', { 
      dataPoints: data.length,
      chartType: 'line' 
    });
  };
};
```

### Logging de Erros com Contexto

```typescript
import { logger } from '@/lib/logger';

const handleApiError = (error: ApiError, context: any) => {
  logger.error('API Error', {
    status: error.status,
    message: error.message,
    endpoint: context.endpoint,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }, 'API', 'error');
};
```

## Dicas de Uso

1. **Use níveis apropriados**: debug para desenvolvimento, info para fluxos importantes, warn para situações suspeitas, error para problemas reais.

2. **Inclua contexto relevante**: Sempre que possível, inclua dados que ajudem a entender o que estava acontecendo quando o log foi gerado.

3. **Use componentes e ações**: Isso facilita a filtragem e análise dos logs.

4. **Performance logging**: Use para identificar gargalos na aplicação.

5. **Não logue dados sensíveis**: Evite incluir senhas, tokens ou dados pessoais nos logs.

## Configuração de Produção

Para produção, configure:

```bash
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
VITE_LOG_TO_CONSOLE=false
VITE_LOG_TO_STORAGE=false
VITE_LOG_TO_BACKEND=true
```

Isso garante que apenas erros críticos sejam logados e enviados para o backend para análise.
