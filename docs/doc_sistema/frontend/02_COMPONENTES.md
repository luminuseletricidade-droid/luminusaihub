# Frontend - Catalogo de Componentes

## Estrutura de Componentes

Os componentes estao organizados em pastas por dominio funcional.

---

## Componentes UI Base (`src/components/ui/`)

Componentes Shadcn/UI baseados em Radix primitives:

| Componente | Descricao | Uso |
|------------|-----------|-----|
| `Button` | Botao com variantes | Acoes principais |
| `Input` | Campo de entrada | Formularios |
| `Select` | Dropdown de selecao | Selecao unica |
| `Checkbox` | Caixa de selecao | Selecao multipla |
| `Dialog` | Modal dialog | Confirmacoes, formularios |
| `Sheet` | Painel lateral | Menus, detalhes |
| `Card` | Container card | Agrupamento visual |
| `Table` | Tabela de dados | Listagens |
| `Tabs` | Abas de navegacao | Secoes |
| `Toast` | Notificacao | Feedback |
| `Tooltip` | Dica flutuante | Ajuda contextual |
| `Badge` | Etiqueta | Status, contadores |
| `Avatar` | Imagem de usuario | Perfil |
| `Calendar` | Seletor de data | Formularios |
| `Popover` | Popup flutuante | Menus contextuais |
| `Skeleton` | Placeholder loading | Carregamento |
| `Progress` | Barra de progresso | Upload, processamento |
| `Separator` | Linha divisoria | Separacao visual |

---

## Componentes de Dashboard (`src/components/dashboard/`)

### KPI.tsx
Card de metrica principal.

```typescript
interface KPIProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
}
```

**Uso:** Exibir metricas numericas com icone e tendencia.

---

### DetailedStatusCard.tsx
Card com breakdown de status.

```typescript
interface DetailedStatusCardProps {
  title: string;
  description?: string;
  late: number;         // EM ATRASO
  onSchedule: number;   // EM DIA
  inProgress: number;   // EM ANDAMENTO
  planned: number;      // PROGRAMADO
  pending: number;      // PENDENTE
}
```

**Uso:** Mostrar contagem por status em um contexto (regiao, tecnico, etc).

---

### MaintenanceTaskCard.tsx
Card de tarefa de manutencao.

```typescript
interface MaintenanceTaskCardProps {
  task: MaintenanceTask;
  activeFilter: Status | 'ALL';
}
```

**Caracteristicas:**
- Header escuro com cliente e codigo
- Status geral em badge colorido
- Lista de manutencoes filtradas
- Icones por tipo de status
- Expansao para ver pendencias (backlog)

---

### StatusDistributionChart.tsx
Grafico de pizza com distribuicao de status.

**Biblioteca:** Recharts
**Cores:**
- EM DIA: Verde (#22c55e)
- EM ATRASO: Vermelho (#ef4444)
- EM ANDAMENTO: Amarelo (#eab308)
- PROGRAMADO: Azul (#3b82f6)
- PENDENTE: Cinza (#6b7280)

---

### TasksByTechnicianChart.tsx
Grafico de barras horizontais por tecnico.

---

### TasksByRegionChart.tsx
Grafico de barras por regiao.

---

### MonthlyTasksEvolutionChart.tsx
Grafico de linha com evolucao mensal.

---

## Componentes de Calendario (`src/components/calendar/`)

### DailyCalendarView.tsx
Visualizacao diaria com timeline de horas.

### WeeklyCalendarView.tsx
Visualizacao semanal em grade 7 colunas.

### MonthlyCalendarView.tsx
Visualizacao mensal tradicional.

### YearlyCalendarView.tsx
Visualizacao anual compacta.

### MaintenanceCalendarSidebar.tsx
Barra lateral com filtros e legenda.

### CalendarToolbar.tsx
Barra de ferramentas com navegacao e visualizacoes.

### CalendarEventModal.tsx
Modal de detalhes do evento.

---

## Componentes de Chat (`src/components/chat/`)

### ModernContractChat.tsx
Chat principal com IA para contratos.

**Caracteristicas:**
- Interface de mensagens
- Envio de texto e arquivos
- Historico de conversas
- Contexto do contrato atual

### ChatHistory.tsx
Lista de sessoes de chat anteriores.

### ChatInputArea.tsx
Area de input com suporte a arquivos.

### ChatMessage.tsx
Bolha de mensagem individual.

### ChatLoadingIndicator.tsx
Indicador de digitacao/processamento.

---

## Componentes de Contratos (`src/components/contracts/`)

### ContractCard.tsx
Card resumo de contrato na listagem.

### ContractEditor.tsx
Editor completo de contrato.

### ContractEditForm.tsx
Formulario de edicao de campos.

### ContractUpload.tsx
Upload de PDF com extracao.

### ContractDocumentsWithAgents.tsx
Geracao de documentos via IA.

### ContractTableView.tsx
Visualizacao em tabela.

### ContractGridView.tsx
Visualizacao em grid de cards.

---

## Componentes de Clientes (`src/components/clients/`)

### ClientCard.tsx
Card de cliente.

### ClientForm.tsx
Formulario de cadastro/edicao.

### ClientSearchBar.tsx
Barra de busca de clientes.

---

## Componentes de Layout (`src/components/`)

### ResponsiveLayout.tsx
Layout principal responsivo com sidebar.

### Sidebar.tsx
Menu lateral de navegacao.

### Header.tsx
Cabecalho com usuario e acoes.

### ProtectedRoute.tsx
Wrapper para rotas autenticadas.

### AdminRoute.tsx
Wrapper para rotas administrativas.

### SecurityProvider.tsx
Provider de contexto de seguranca.

---

## Componentes Comuns (`src/components/common/`)

### LoadingSpinner.tsx
Spinner de carregamento.

### ErrorBoundary.tsx
Captura de erros React.

### EmptyState.tsx
Estado vazio de listagens.

### ConfirmDialog.tsx
Dialog de confirmacao.

### SearchInput.tsx
Input de busca com debounce.

### Pagination.tsx
Controles de paginacao.

### DateRangePicker.tsx
Seletor de intervalo de datas.

### FileUploader.tsx
Componente de upload de arquivos.

---

## Tipos Compartilhados (`src/components/dashboard/types.ts`)

```typescript
// Status de manutencao
export type Status =
  | 'EM DIA'
  | 'EM ATRASO'
  | 'PROGRAMADO'
  | 'PENDENTE'
  | 'EM ANDAMENTO'
  | null;

// Item de manutencao individual
export interface MaintenanceItem {
  id: string;
  type: string;
  date: string | null;
  status: Status;
  technician: string | null;
}

// Tarefa de manutencao (card)
export interface MaintenanceTask {
  id: string;           // contract_id
  client: string;
  code: string;         // contract_number
  powerKVA: number | null;
  region: string;
  technician: string | null;
  maintenances: MaintenanceItem[];
  maintenanceType: string | null;
  maintenanceStatus: Status;
  maintenanceDate: string | null;
  // Campos legados...
  backlog: string | null;
  observations: string | null;
}
```

---

## Utilitarios de Componentes (`src/components/dashboard/utils/`)

### statusHelper.ts

```typescript
// Parseia data DD/MM/YY para Date
parseDate(dateStr: string | null): Date | null

// Extrai todas as datas de uma tarefa
getAllTaskDates(task: MaintenanceTask): Date[]

// Obtem todos os status de uma tarefa
getTaskStatuses(task: MaintenanceTask): Status[]

// Calcula status geral (prioridade: ATRASO > ANDAMENTO > PROGRAMADO > PENDENTE > DIA)
getOverallStatus(task: MaintenanceTask): Status
```

---

## Padroes de Componentes

### Nomenclatura
- PascalCase para componentes
- Props interface com sufixo `Props`
- Arquivos `.tsx` para componentes

### Estrutura de Arquivo
```typescript
import React from 'react';
import { /* deps */ } from '...';

interface ComponentProps {
  // props tipadas
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // hooks
  // handlers
  // render
  return (
    <div>...</div>
  );
};

export default Component;
```

### Estilizacao
- Classes Tailwind inline
- Variantes via `cn()` utility
- Responsividade com prefixos (`sm:`, `md:`, `lg:`)
