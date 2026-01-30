# Frontend - Custom Hooks

## Visao Geral

O sistema possui 40+ custom hooks organizados por funcionalidade. Hooks sao funcoes React que encapsulam logica reutilizavel.

---

## Hooks de Autenticacao

### useAuth
**Arquivo:** `src/hooks/useAuth.ts`

Hook principal de autenticacao.

```typescript
const { user, isAuthenticated, login, logout, isLoading } = useAuth();
```

| Retorno | Tipo | Descricao |
|---------|------|-----------|
| `user` | `User \| null` | Usuario logado |
| `isAuthenticated` | `boolean` | Status de autenticacao |
| `login` | `(email, password) => Promise` | Funcao de login |
| `logout` | `() => void` | Funcao de logout |
| `isLoading` | `boolean` | Carregando estado |

---

### useAuthSession
**Arquivo:** `src/hooks/useAuthSession.ts`

Gerencia sessao de autenticacao com renovacao automatica.

```typescript
const { session, refreshSession, isExpired } = useAuthSession();
```

---

### useAuthenticatedRequest
**Arquivo:** `src/hooks/useAuthenticatedRequest.ts`

Wrapper para requisicoes autenticadas.

```typescript
const { request, isLoading, error } = useAuthenticatedRequest();

// Uso
const data = await request('/api/endpoint', { method: 'GET' });
```

---

## Hooks de Chat/IA

### useChatSession
**Arquivo:** `src/hooks/useChatSession.ts`

Gerencia sessao de chat com IA.

```typescript
const {
  messages,
  sendMessage,
  isLoading,
  createSession,
  loadHistory
} = useChatSession(contractId);
```

---

### useImprovedChatSession
**Arquivo:** `src/hooks/useImprovedChatSession.ts`

Versao otimizada do chat com cache e retry.

---

### useChatFileContext
**Arquivo:** `src/hooks/useChatFileContext.ts`

Gerencia arquivos anexados no chat.

```typescript
const { files, addFile, removeFile, uploadFiles } = useChatFileContext();
```

---

### useStreamingChat
**Arquivo:** `src/hooks/useStreamingChat.ts`

Chat com streaming de resposta via SSE.

```typescript
const { streamMessage, partialResponse, isStreaming } = useStreamingChat();
```

---

## Hooks de Contratos

### useContractExtraction
**Arquivo:** `src/hooks/useContractExtraction.ts`

Extracao de dados de PDF de contrato.

```typescript
const { extractData, isExtracting, progress, result } = useContractExtraction();
```

---

### useContractsByClient
**Arquivo:** `src/hooks/useContractsByClient.ts`

Lista contratos por cliente.

```typescript
const { contracts, isLoading } = useContractsByClient(clientId);
```

---

### useContractServices
**Arquivo:** `src/hooks/useContractServices.ts`

Servicos inclusos no contrato.

---

### useContractSync
**Arquivo:** `src/hooks/useContractSync.ts`

Sincronizacao de contratos com backend.

```typescript
const { sync, isSyncing, lastSync } = useContractSync();
```

---

### useContractData
**Arquivo:** `src/hooks/useContractData.ts`

Hook principal para dados de contrato.

```typescript
const {
  contract,
  updateContract,
  deleteContract,
  isLoading,
  error
} = useContractData(contractId);
```

---

## Hooks de Manutencao

### useMaintenanceFilters
**Arquivo:** `src/hooks/useMaintenanceFilters.ts`

Gerencia filtros da tela de manutencoes.

```typescript
const {
  filters,
  setFilter,
  clearFilters,
  filteredData
} = useMaintenanceFilters(maintenances);
```

| Filtro | Tipo | Descricao |
|--------|------|-----------|
| `status` | `Status[]` | Filtro por status |
| `type` | `string[]` | Tipo de manutencao |
| `technician` | `string` | Tecnico responsavel |
| `region` | `string` | Regiao |
| `dateRange` | `[Date, Date]` | Periodo |

---

### useMaintenanceStatusSync
**Arquivo:** `src/hooks/useMaintenanceStatusSync.ts`

Sincroniza status de manutencao.

---

### useMaintenanceSync
**Arquivo:** `src/hooks/useMaintenanceSync.ts`

Sincronizacao geral de manutencoes.

---

### useMaintenanceData
**Arquivo:** `src/hooks/useMaintenanceData.ts`

Dados de manutencao individual.

---

## Hooks de Otimizacao

### useOptimizedContractQueries
**Arquivo:** `src/hooks/useOptimizedContractQueries.ts`

Queries otimizadas com prefetch e cache.

```typescript
const { contracts, prefetchContract, invalidate } = useOptimizedContractQueries();
```

---

### useOptimizedMaintenanceData
**Arquivo:** `src/hooks/useOptimizedMaintenanceData.ts`

Dados de manutencao com paginacao virtual.

---

### useOptimizedDashboardMetrics
**Arquivo:** `src/hooks/useOptimizedDashboardMetrics.ts`

Metricas do dashboard com cache agressivo.

---

## Hooks de Upload

### useUploadProgress
**Arquivo:** `src/hooks/useUploadProgress.ts`

Rastreia progresso de upload.

```typescript
const { progress, isUploading, error, upload } = useUploadProgress();
```

---

### useFileUpload
**Arquivo:** `src/hooks/useFileUpload.ts`

Upload de arquivos generico.

---

### usePdfUpload
**Arquivo:** `src/hooks/usePdfUpload.ts`

Upload especifico de PDFs com validacao.

---

## Hooks de Realtime

### useRealtimeSubscription
**Arquivo:** `src/hooks/useRealtimeSubscription.ts`

Inscricao em canais Supabase Realtime.

```typescript
useRealtimeSubscription('contracts', {
  onInsert: (payload) => handleNew(payload),
  onUpdate: (payload) => handleUpdate(payload),
  onDelete: (payload) => handleDelete(payload),
});
```

---

### useRealtimeContracts
**Arquivo:** `src/hooks/useRealtimeContracts.ts`

Realtime especifico para contratos.

---

### useRealtimeMaintenances
**Arquivo:** `src/hooks/useRealtimeMaintenances.ts`

Realtime especifico para manutencoes.

---

## Hooks Utilitarios

### useDebounce
**Arquivo:** `src/hooks/useDebounce.ts`

Debounce de valor.

```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
```

---

### useInfiniteScroll
**Arquivo:** `src/hooks/useInfiniteScroll.ts`

Scroll infinito para listagens.

```typescript
const { loadMore, hasMore, isLoading } = useInfiniteScroll({
  fetchMore: loadNextPage,
  threshold: 100
});
```

---

### usePrefetch
**Arquivo:** `src/hooks/usePrefetch.ts`

Prefetch de dados ao hover.

---

### useRateLimit
**Arquivo:** `src/hooks/useRateLimit.ts`

Rate limiting de acoes.

```typescript
const { canExecute, execute, remaining } = useRateLimit({
  maxRequests: 10,
  windowMs: 60000
});
```

---

### useLocalStorage
**Arquivo:** `src/hooks/useLocalStorage.ts`

Persistencia em localStorage.

```typescript
const [value, setValue] = useLocalStorage('key', defaultValue);
```

---

### useMediaQuery
**Arquivo:** `src/hooks/useMediaQuery.ts`

Detecta breakpoints.

```typescript
const isMobile = useMediaQuery('(max-width: 768px)');
```

---

## Hooks de Formulario

### useFormValidation
**Arquivo:** `src/hooks/useFormValidation.ts`

Validacao de formularios.

---

### useFormPersist
**Arquivo:** `src/hooks/useFormPersist.ts`

Persiste dados de formulario durante edicao.

---

## Hooks de Calendario

### useCalendarNavigation
**Arquivo:** `src/hooks/useCalendarNavigation.ts`

Navegacao do calendario.

```typescript
const { currentDate, goToNext, goToPrev, goToToday, setView } = useCalendarNavigation();
```

---

### useCalendarEvents
**Arquivo:** `src/hooks/useCalendarEvents.ts`

Eventos do calendario.

---

## Padrao de Implementacao

### Estrutura Basica

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useMyHook(param: string) {
  // Estado local
  const [state, setState] = useState(initialValue);

  // Query para dados
  const { data, isLoading, error } = useQuery({
    queryKey: ['myData', param],
    queryFn: () => fetchData(param),
  });

  // Mutation para acoes
  const mutation = useMutation({
    mutationFn: updateData,
    onSuccess: () => {
      // Invalidar cache
    },
  });

  // Handlers memorizados
  const handleAction = useCallback(() => {
    mutation.mutate(state);
  }, [state, mutation]);

  // Efeitos
  useEffect(() => {
    // Setup/cleanup
  }, [param]);

  return {
    data,
    state,
    setState,
    handleAction,
    isLoading,
    error,
  };
}
```

### Convencoes

1. **Prefixo `use`**: Obrigatorio para hooks
2. **Retorno objeto**: Facilita destructuring
3. **Memoizacao**: `useCallback` para handlers, `useMemo` para valores
4. **Cleanup**: Sempre limpar subscricoes em `useEffect`
5. **Error handling**: Sempre expor estado de erro
