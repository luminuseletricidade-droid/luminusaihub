# Frontend - Paginas da Aplicacao

## Visao Geral das Paginas

O sistema possui 19 paginas organizadas em 3 categorias: publicas, protegidas e administrativas.

---

## Paginas Publicas

### Index (`/`)
**Arquivo:** `src/pages/Index.tsx`

Landing page do sistema. Apresenta:
- Hero section com proposta de valor
- Features do sistema
- Call-to-action para login/registro

### EnhancedAuth (`/auth`)
**Arquivo:** `src/components/EnhancedAuth.tsx`

Tela de autenticacao unificada:
- Formulario de login
- Formulario de registro
- Recuperacao de senha
- Validacao de campos em tempo real
- Feedback visual de erros

---

## Paginas Protegidas (Requerem Login)

### Dashboard (`/app/dashboard`)
**Arquivo:** `src/pages/Dashboard.tsx`

Painel principal com visao geral do sistema:

| Secao | Descricao |
|-------|-----------|
| KPIs | Cards com metricas principais (contratos ativos, manutencoes pendentes, etc) |
| Grafico Status | Distribuicao de status das manutencoes (Em Dia, Atrasado, Programado, Pendente, Em Andamento) |
| Grafico Tecnicos | Tarefas por tecnico |
| Grafico Regioes | Distribuicao geografica |
| Evolucao Mensal | Tendencia de manutencoes ao longo do tempo |
| Cards de Tarefas | Lista de manutencoes com filtros por status |

**Componentes utilizados:**
- `KPI` - Cards de metricas
- `DetailedStatusCard` - Cards de status detalhado
- `MaintenanceTaskCard` - Cards de tarefas
- `StatusDistributionChart` - Grafico pizza
- `TasksByTechnicianChart` - Grafico barras
- `TasksByRegionChart` - Grafico barras
- `MonthlyTasksEvolutionChart` - Grafico linha

---

### Contracts (`/app/contracts`)
**Arquivo:** `src/pages/Contracts.tsx` (84KB)

Gestao completa de contratos:

| Funcionalidade | Descricao |
|----------------|-----------|
| Listagem | Tabela paginada com todos contratos |
| Busca | Filtro por cliente, numero, status |
| Visualizacao | Modal com detalhes do contrato |
| Edicao | Formulario de edicao inline |
| Upload PDF | Extracao automatica de dados via IA |
| Chat IA | Assistente para duvidas sobre contrato |

**Componentes utilizados:**
- `ContractCard` - Card resumo do contrato
- `ContractEditor` - Editor de contrato
- `ContractEditForm` - Formulario de edicao
- `ContractUpload` - Upload de PDF
- `ModernContractChat` - Chat com IA
- `ContractDocumentsWithAgents` - Geracao de documentos

---

### Clients (`/app/clients`)
**Arquivo:** `src/pages/Clients.tsx`

Cadastro e gestao de clientes:

| Funcionalidade | Descricao |
|----------------|-----------|
| Listagem | Grid de cards de clientes |
| Busca | Filtro por nome, CNPJ, cidade |
| Cadastro | Modal de novo cliente |
| Edicao | Formulario de edicao |
| Integracao ViaCEP | Busca automatica de endereco por CEP |

**Campos do cliente:**
- Razao Social, Nome Fantasia
- CNPJ, Inscricao Estadual
- Endereco completo (CEP, Rua, Numero, Bairro, Cidade, Estado)
- Contato (Telefone, Email)
- Responsavel tecnico

---

### Maintenances (`/app/maintenances`)
**Arquivo:** `src/pages/Maintenances.tsx` (62KB)

Controle de manutencoes:

| Funcionalidade | Descricao |
|----------------|-----------|
| Listagem | Tabela com todas manutencoes |
| Filtros | Por status, tipo, periodo, tecnico, regiao |
| Status | Em Dia, Em Atraso, Programado, Pendente, Em Andamento |
| Atualizacao | Mudanca de status em lote |
| Historico | Registro de alteracoes |

**Tipos de manutencao:**
- Manutencao Mensal
- Manutencao Preventiva 250h
- Manutencao Preventiva 500h
- Limpeza de Tanque
- Limpeza de Radiador
- Megagem de Alternador
- Regulagem de Valvulas
- Troca de Bateria
- Manutencao Corretiva
- Atendimento Emergencial

---

### Cronogramas (`/app/cronogramas`)
**Arquivo:** `src/pages/Cronogramas.tsx`

Geracao de cronogramas de manutencao:

| Funcionalidade | Descricao |
|----------------|-----------|
| Geracao IA | Cronograma gerado automaticamente |
| Visualizacao | Timeline de atividades |
| Exportacao | Download em PDF/Excel |
| Parametros | Configuracao de periodos e prioridades |

---

### Reports (`/app/reports`)
**Arquivo:** `src/pages/Reports.tsx` (40KB)

Central de relatorios:

| Relatorio | Descricao |
|-----------|-----------|
| Status Geral | Visao consolidada de todas manutencoes |
| Por Periodo | Filtro por data inicio/fim |
| Por Regiao | Agrupamento geografico |
| Por Tecnico | Performance individual |
| Exportacao XLSX | Download em Excel |
| Exportacao PDF | Download em PDF |

**Filtros disponiveis:**
- Periodo (ano, mes, intervalo customizado)
- Status (multipla selecao)
- Regiao
- Tecnico
- Tipo de manutencao

---

### Calendar (`/app/calendar`)
**Arquivo:** `src/pages/Calendar.tsx`

Calendario de manutencoes:

| Visualizacao | Descricao |
|--------------|-----------|
| Diaria | Agenda do dia |
| Semanal | Semana em colunas |
| Mensal | Grade mensal |
| Anual | Visao do ano completo |

**Componentes:**
- `DailyCalendarView`
- `WeeklyCalendarView`
- `MonthlyCalendarView`
- `YearlyCalendarView`
- `MaintenanceCalendarSidebar`
- `CalendarToolbar`

---

### AIAgents (`/app/ai-agents`)
**Arquivo:** `src/pages/AIAgents.tsx`

Central de agentes de IA:

| Agente | Funcao |
|--------|--------|
| Smart Chat | Chat inteligente com contexto |
| PDF Processor | Extracao de dados de PDF |
| Maintenance Planner | Planejamento de manutencoes |
| Report Generator | Geracao de relatorios |
| Schedule Generator | Geracao de cronogramas |
| Document Generator | Geracao de documentos |

---

### Profile (`/app/profile`)
**Arquivo:** `src/pages/Profile.tsx`

Perfil do usuario:

| Secao | Descricao |
|-------|-----------|
| Dados Pessoais | Nome, email, telefone |
| Senha | Alteracao de senha |
| Preferencias | Configuracoes de notificacao |
| Avatar | Upload de foto |

---

## Paginas Administrativas (Requerem Role Admin)

### AdminDashboard (`/app/admin`)
**Arquivo:** `src/pages/AdminDashboard.tsx`

Dashboard administrativo:
- Metricas de uso do sistema
- Usuarios ativos
- Logs de atividade recentes
- Alertas de sistema

---

### AdminUsers (`/app/admin/users`)
**Arquivo:** `src/pages/admin/AdminUsers.tsx`

Gestao de usuarios:

| Funcionalidade | Descricao |
|----------------|-----------|
| Listagem | Tabela de todos usuarios |
| Criar | Novo usuario com role |
| Editar | Alterar dados e permissoes |
| Desativar | Bloquear acesso |
| Roles | admin, user, technician |

---

### AdminSettings (`/app/admin/settings`)
**Arquivo:** `src/pages/admin/AdminSettings.tsx`

Configuracoes do sistema:
- Parametros gerais
- Integracao com servicos externos
- Configuracoes de IA
- Backup e restauracao

---

### AdminLogs (`/app/admin/logs`)
**Arquivo:** `src/pages/admin/AdminLogs.tsx`

Logs de auditoria:
- Acoes de usuarios
- Erros do sistema
- Acessos e tentativas
- Filtros por data e tipo

---

### AccessDenied (`/access-denied`)
**Arquivo:** `src/pages/AccessDenied.tsx`

Pagina de acesso negado:
- Mensagem informativa
- Link para voltar ao dashboard
- Contato com administrador

---

## Navegacao

A navegacao e feita via `ResponsiveLayout` que inclui:
- Sidebar com menu principal
- Header com usuario e notificacoes
- Breadcrumbs contextuais
- Footer com informacoes do sistema
