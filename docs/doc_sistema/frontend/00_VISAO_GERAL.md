# Frontend - Visao Geral

## Arquitetura

O frontend do Luminus AI Hub e uma **Single Page Application (SPA)** construida com as seguintes tecnologias:

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| React | 18.3.1 | Biblioteca UI principal |
| TypeScript | 5.5.3 | Tipagem estatica |
| Vite | 5.4.1 | Build tool e dev server |
| TailwindCSS | 3.4.11 | Framework CSS utility-first |
| Shadcn/UI | - | Componentes baseados em Radix |
| React Router DOM | 6.26.2 | Roteamento SPA |
| TanStack Query | 5.83.1 | Gerenciamento de estado servidor |
| Recharts | 2.12.7 | Graficos e visualizacoes |

## Estrutura de Pastas

```
src/
├── components/          # Componentes reutilizaveis
│   ├── ui/             # Componentes Shadcn/UI base
│   ├── dashboard/      # Componentes do dashboard
│   ├── calendar/       # Componentes do calendario
│   ├── chat/           # Componentes de chat IA
│   ├── contracts/      # Componentes de contratos
│   ├── clients/        # Componentes de clientes
│   └── admin/          # Componentes administrativos
├── pages/              # Paginas/Rotas da aplicacao
├── hooks/              # Custom hooks React
├── contexts/           # Context providers
├── services/           # Servicos de API
├── integrations/       # Integracoes externas (Supabase)
├── lib/                # Utilitarios
└── types/              # Definicoes TypeScript
```

## Fluxo de Autenticacao

1. Usuario acessa `/auth` para login/registro
2. Credenciais sao enviadas ao backend FastAPI
3. Backend retorna JWT token
4. Token armazenado no `localStorage`
5. Rotas protegidas verificam token via `ProtectedRoute`
6. Rotas admin verificam role via `AdminRoute`

## Gerenciamento de Estado

### React Query (TanStack Query)

Configuracao global no `App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000,   // 10 minutos
    },
  },
});
```

### Context API

- `AuthContext`: Estado de autenticacao global
- `QueryClientProvider`: Provedor React Query

## Lazy Loading

Paginas secundarias usam `React.lazy()` para code splitting:

```typescript
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Maintenances = lazy(() => import("./pages/Maintenances"));
// ...
```

## Rotas da Aplicacao

| Rota | Componente | Protegida | Admin |
|------|------------|-----------|-------|
| `/` | Index | Nao | Nao |
| `/auth` | EnhancedAuth | Nao | Nao |
| `/app/dashboard` | Dashboard | Sim | Nao |
| `/app/contracts` | Contracts | Sim | Nao |
| `/app/clients` | Clients | Sim | Nao |
| `/app/maintenances` | Maintenances | Sim | Nao |
| `/app/cronogramas` | Cronogramas | Sim | Nao |
| `/app/reports` | Reports | Sim | Nao |
| `/app/calendar` | Calendar | Sim | Nao |
| `/app/ai-agents` | AIAgents | Sim | Nao |
| `/app/profile` | Profile | Sim | Nao |
| `/app/admin` | AdminDashboard | Sim | Sim |
| `/app/admin/users` | AdminUsers | Sim | Sim |
| `/app/admin/settings` | AdminSettings | Sim | Sim |
| `/app/admin/logs` | AdminLogs | Sim | Sim |

## Convencoes de Codigo

### Imports com Alias

O projeto usa `@/` como alias para `src/`:

```typescript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
```

### Estilizacao

- TailwindCSS para estilos utility
- Componentes Shadcn/UI para UI consistente
- Tokens de design em `tailwind.config.ts`

### Tipagem

- Todos componentes usam TypeScript
- Interfaces definidas em `types/` ou localmente
- Props tipadas com `interface` ou `type`

## Proximos Arquivos

- [01_PAGINAS.md](./01_PAGINAS.md) - Documentacao de cada pagina
- [02_COMPONENTES.md](./02_COMPONENTES.md) - Catalogo de componentes
- [03_HOOKS.md](./03_HOOKS.md) - Custom hooks documentados
- [04_SERVICOS.md](./04_SERVICOS.md) - Servicos e API
