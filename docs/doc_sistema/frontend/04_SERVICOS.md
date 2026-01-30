# Frontend - Servicos e API

## Visao Geral

Os servicos encapsulam a comunicacao com o backend FastAPI e integracoes externas.

---

## Servico Principal de API

### api.ts
**Arquivo:** `src/services/api.ts`

Wrapper centralizado para chamadas ao backend.

```typescript
import { api } from '@/services/api';

// GET
const data = await api.get('/endpoint');

// POST
const result = await api.post('/endpoint', { body: data });

// PUT
const updated = await api.put('/endpoint', { body: data });

// DELETE
await api.delete('/endpoint');
```

**Caracteristicas:**
- Base URL configuravel via env
- Headers de autenticacao automaticos
- Interceptor de erros global
- Retry automatico para erros transientes
- Timeout configuravel

---

### Configuracao

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Adiciona token JWT automaticamente
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

---

## Servico de Erros

### errorLogger.ts
**Arquivo:** `src/services/errorLogger.ts`

Logging centralizado de erros.

```typescript
import { logError, logWarning, logInfo } from '@/services/errorLogger';

// Erro critico
logError('Falha ao carregar contratos', error, { context: 'ContractsPage' });

// Aviso
logWarning('Cache expirado', { key: 'contracts' });

// Info
logInfo('Usuario logou', { userId: user.id });
```

**Funcionalidades:**
- Envio para servico de monitoramento (opcional)
- Persistencia local para debug
- Stack trace formatado
- Contexto adicional

---

## Servico ViaCEP

### viacep.ts
**Arquivo:** `src/services/viacep.ts`

Integracao com API ViaCEP para busca de enderecos.

```typescript
import { fetchAddressByCep } from '@/services/viacep';

const address = await fetchAddressByCep('01310100');

// Retorno
{
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  complemento: '',
  bairro: 'Bela Vista',
  localidade: 'Sao Paulo',
  uf: 'SP',
  ibge: '3550308',
  gia: '1004',
  ddd: '11',
  siafi: '7107'
}
```

---

## Integracao Supabase

### Cliente Supabase
**Arquivo:** `src/integrations/supabase/client.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('status', 'active');

// Insert
const { data, error } = await supabase
  .from('contracts')
  .insert({ ... });

// Update
const { data, error } = await supabase
  .from('contracts')
  .update({ ... })
  .eq('id', contractId);

// Delete
const { error } = await supabase
  .from('contracts')
  .delete()
  .eq('id', contractId);
```

---

### Tipos Supabase
**Arquivo:** `src/integrations/supabase/types.ts`

Tipos gerados automaticamente do schema do banco.

```typescript
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];
```

---

## Endpoints da API Backend

### Autenticacao

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/auth/signup` | Registro de usuario |
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/user` | Usuario atual |
| PUT | `/api/auth/update-profile` | Atualizar perfil |
| PUT | `/api/auth/change-password` | Alterar senha |

---

### Contratos

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/contracts` | Listar contratos |
| GET | `/api/contracts/{id}` | Obter contrato |
| POST | `/api/contracts` | Criar contrato |
| PUT | `/api/contracts/{id}` | Atualizar contrato |
| DELETE | `/api/contracts/{id}` | Excluir contrato |

---

### Manutencoes

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/maintenances` | Listar manutencoes |
| GET | `/api/maintenances/{id}` | Obter manutencao |
| POST | `/api/maintenances` | Criar manutencao |
| PUT | `/api/maintenances/{id}` | Atualizar manutencao |
| DELETE | `/api/maintenances/{id}` | Excluir manutencao |

---

### Clientes

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/clients` | Listar clientes |
| GET | `/api/clients/{id}` | Obter cliente |
| POST | `/api/clients` | Criar cliente |
| PUT | `/api/clients/{id}` | Atualizar cliente |
| DELETE | `/api/clients/{id}` | Excluir cliente |

---

### Processamento PDF

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/process-base64-pdf` | Processar PDF em base64 |
| POST | `/api/process-pdf-storage` | Processar PDF do storage |
| POST | `/api/extract-pdf` | Extrair dados de PDF |
| POST | `/api/extract-text` | Extrair texto de PDF |

---

### Chat/IA

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/chat-sessions` | Listar sessoes |
| POST | `/api/chat-sessions` | Criar sessao |
| GET | `/api/chat-messages/{session_id}` | Mensagens da sessao |
| POST | `/api/smart-chat` | Enviar mensagem ao chat IA |

---

### Agentes IA

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/ai-agents` | Listar agentes |
| POST | `/api/generate-document` | Gerar documento |
| GET | `/api/agno-status` | Status dos agentes |

---

### Dashboard

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/dashboard-metrics` | Metricas do dashboard |

---

### Admin

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/admin/users` | Listar usuarios |
| POST | `/api/admin/users` | Criar usuario |
| PUT | `/api/admin/users/{id}` | Atualizar usuario |
| DELETE | `/api/admin/users/{id}` | Excluir usuario |

---

## Tratamento de Erros

### apiErrorHandler.ts
**Arquivo:** `src/utils/apiErrorHandler.ts`

```typescript
import { setupFetchInterceptor } from '@/utils/apiErrorHandler';

// Inicializado no App.tsx
setupFetchInterceptor();
```

**Erros tratados:**
- 401 Unauthorized: Redireciona para login
- 403 Forbidden: Mostra acesso negado
- 404 Not Found: Toast informativo
- 500 Server Error: Toast de erro
- Network Error: Toast de conexao

---

## Padrao de Requisicao

```typescript
// Exemplo de hook usando o servico
export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await api.get('/api/contracts');
      if (!response.ok) {
        throw new Error('Falha ao carregar contratos');
      }
      return response.json();
    },
  });
}

// Com mutation
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContractInsert) =>
      api.post('/api/contracts', { body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: 'Contrato criado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar contrato', variant: 'destructive' });
    },
  });
}
```
