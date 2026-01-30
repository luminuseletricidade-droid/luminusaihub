# Bibliotecas Frontend

## Visao Geral

Documentacao das principais bibliotecas utilizadas no frontend.

---

## React 18.3.1

### Descricao
Biblioteca JavaScript para construcao de interfaces de usuario.

### Hooks Principais

| Hook | Finalidade |
|------|------------|
| `useState` | Estado local do componente |
| `useEffect` | Efeitos colaterais (fetch, subscricoes) |
| `useContext` | Acesso a contextos globais |
| `useReducer` | Estado complexo com reducers |
| `useMemo` | Memoizacao de valores |
| `useCallback` | Memoizacao de funcoes |
| `useRef` | Referencia mutavel |

### Exemplo de Uso

```typescript
import { useState, useEffect, useCallback } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  const handleClick = useCallback(() => {
    // acao
  }, []);

  if (loading) return <Spinner />;
  return <div>{data}</div>;
}
```

---

## TanStack React Query 5.83.1

### Descricao
Gerenciamento de estado do servidor com cache, sincronizacao e atualizacoes.

### Conceitos Principais

| Conceito | Descricao |
|----------|-----------|
| `useQuery` | Busca dados com cache |
| `useMutation` | Executa mutacoes |
| `useQueryClient` | Acesso ao cliente de cache |
| `queryKey` | Identificador unico da query |
| `staleTime` | Tempo ate dados ficarem "stale" |
| `gcTime` | Tempo de garbage collection |

### Exemplo de Uso

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['contracts'],
  queryFn: fetchContracts,
  staleTime: 5 * 60 * 1000, // 5 minutos
});

// Mutation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createContract,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  },
});
```

### Configuracao Global

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});
```

---

## React Router DOM 6.26.2

### Descricao
Roteamento declarativo para aplicacoes React.

### Componentes Principais

| Componente | Finalidade |
|------------|------------|
| `BrowserRouter` | Provider de roteamento |
| `Routes` | Container de rotas |
| `Route` | Definicao de rota |
| `Navigate` | Redirecionamento |
| `Outlet` | Renderiza rotas filhas |
| `Link` | Navegacao sem reload |

### Hooks

| Hook | Finalidade |
|------|------------|
| `useNavigate` | Navegacao programatica |
| `useParams` | Parametros da URL |
| `useLocation` | Localizacao atual |
| `useSearchParams` | Query strings |

### Exemplo de Uso

```typescript
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
      </Route>
    </Routes>
  );
}

function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/app/contracts')}>
      Voltar
    </button>
  );
}
```

---

## TailwindCSS 3.4.11

### Descricao
Framework CSS utility-first para estilizacao rapida.

### Classes Comuns

| Categoria | Exemplos |
|-----------|----------|
| Layout | `flex`, `grid`, `block`, `hidden` |
| Spacing | `p-4`, `m-2`, `gap-4`, `space-y-2` |
| Sizing | `w-full`, `h-screen`, `max-w-md` |
| Typography | `text-lg`, `font-bold`, `text-gray-700` |
| Colors | `bg-blue-500`, `text-white`, `border-gray-200` |
| Borders | `rounded-lg`, `border`, `shadow-md` |
| Responsive | `sm:`, `md:`, `lg:`, `xl:` |

### Exemplo de Uso

```tsx
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-800">Titulo</h2>
  <p className="text-sm text-gray-600">Descricao</p>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Acao
  </button>
</div>
```

---

## Shadcn/UI (Radix)

### Descricao
Componentes acessiveis baseados em Radix UI primitives.

### Componentes Disponiveis

| Componente | Uso |
|------------|-----|
| Button | Botoes com variantes |
| Input | Campos de entrada |
| Select | Dropdowns |
| Dialog | Modais |
| Sheet | Paineis laterais |
| Card | Containers |
| Table | Tabelas |
| Tabs | Navegacao em abas |
| Toast | Notificacoes |
| Tooltip | Dicas |

### Exemplo de Uso

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo</DialogTitle>
    </DialogHeader>
    <Input placeholder="Digite aqui" />
    <Button>Confirmar</Button>
  </DialogContent>
</Dialog>
```

---

## Recharts 2.12.7

### Descricao
Biblioteca de graficos para React baseada em D3.

### Tipos de Grafico

| Tipo | Componente |
|------|------------|
| Linha | `LineChart` |
| Barra | `BarChart` |
| Pizza | `PieChart` |
| Area | `AreaChart` |
| Radar | `RadarChart` |

### Exemplo de Uso

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'EM DIA', value: 80, color: '#22c55e' },
  { name: 'EM ATRASO', value: 15, color: '#ef4444' },
  { name: 'PROGRAMADO', value: 25, color: '#3b82f6' },
];

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie data={data} dataKey="value" nameKey="name">
      {data.map((entry, index) => (
        <Cell key={index} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip />
  </PieChart>
</ResponsiveContainer>
```

---

## Lucide React

### Descricao
Biblioteca de icones SVG para React.

### Icones Comuns no Projeto

| Icone | Uso |
|-------|-----|
| `CheckCircle` | Status em dia |
| `AlertTriangle` | Status atrasado |
| `Clock` | Programado |
| `Hourglass` | Pendente |
| `Play` | Em andamento |
| `User` | Usuario/Tecnico |
| `MapPin` | Localizacao |
| `Power` | Potencia |
| `FileText` | Documento |
| `Calendar` | Data |

### Exemplo de Uso

```tsx
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

<div className="flex items-center gap-2">
  <CheckCircle className="h-4 w-4 text-green-500" />
  <span>Em Dia</span>
</div>
```

---

## Date-fns

### Descricao
Biblioteca moderna para manipulacao de datas.

### Funcoes Comuns

| Funcao | Descricao |
|--------|-----------|
| `format` | Formata data |
| `parse` | Parseia string para Date |
| `addDays` | Adiciona dias |
| `subMonths` | Subtrai meses |
| `isAfter` | Compara datas |
| `differenceInDays` | Diferenca em dias |

### Exemplo de Uso

```typescript
import { format, addDays, parse, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formatar
const formatted = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
// "28/11/2025"

// Adicionar dias
const nextWeek = addDays(new Date(), 7);

// Parsear
const date = parse('25/12/2024', 'dd/MM/yyyy', new Date());

// Diferenca
const days = differenceInDays(new Date(), date);
```

---

## XLSX 0.18.5

### Descricao
Biblioteca para leitura e escrita de arquivos Excel.

### Exemplo de Uso

```typescript
import * as XLSX from 'xlsx';

// Criar workbook
const wb = XLSX.utils.book_new();

// Dados
const data = [
  ['Cliente', 'Status', 'Data'],
  ['Empresa A', 'EM DIA', '01/01/2024'],
  ['Empresa B', 'EM ATRASO', '15/01/2024'],
];

// Criar worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Adicionar ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');

// Download
XLSX.writeFile(wb, 'relatorio.xlsx');
```

---

## Supabase JS 2.57.0

### Descricao
Cliente JavaScript para Supabase (PostgreSQL + Auth + Storage + Realtime).

### Funcionalidades

| Modulo | Descricao |
|--------|-----------|
| `auth` | Autenticacao |
| `from()` | Queries no banco |
| `storage` | Upload de arquivos |
| `realtime` | Subscricoes em tempo real |

### Exemplo de Uso

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Query
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('status', 'active');

// Realtime
supabase
  .channel('contracts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' },
    (payload) => console.log(payload)
  )
  .subscribe();

// Storage
await supabase.storage.from('documents').upload('file.pdf', file);
```
