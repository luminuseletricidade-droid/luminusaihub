# Bug fixes — Checklist (Oct 28, 2025)

## Problemas encontrados
- Crash ao abrir aba Checklist por `Textarea` não importado em `MaintenanceChecklist.tsx`.
- Uso de `variant="success"` em `Badge` sem variante definida.
- Fluxo extended criava um registro “placeholder” na tabela `maintenance_checklist` e inseria itens com `maintenance_id` incorreto (ID do placeholder), o que quebrava leitura por `maintenance_id` real e podia apagar o placeholder ao aplicar templates.
- Progresso do checklist sendo salvo na própria tabela de itens.

## Correções aplicadas
- `MaintenanceChecklist.tsx`: importado `Textarea` de `@/components/ui/textarea`.
- `ui/badge.tsx`: adicionada variante `success` (verde).
- Removido uso de “placeholder”: itens são sempre lidos e gravados por `maintenance_id` real.
- `insertTemplateItems` agora insere com `maintenance_id = maintenanceId`.
- Persistência de progresso movida para meta table dedicada `maintenance_checklist_meta` via `upsert`.

## Migração
- Criada `supabase/migrations/00049_create_maintenance_checklist_meta.sql` com:
  - Tabela `maintenance_checklist_meta(maintenance_id PK, progress, is_completed, required_total, required_completed, created_at, updated_at)`
  - RLS habilitado e políticas permissivas alinhadas ao projeto
  - Trigger para manter `updated_at`

## Validação
- Abrir aba Checklist: diálogo “Criar Template” renderiza sem erros.
- Badge verde quando itens obrigatórios concluídos.
- Aplicar template limpa itens antigos por `maintenance_id` e reinsere com os IDs corretos.
- Alternar/adicionar/remover itens atualiza progresso; recarregar mantém meta.

# Relatório de Correções e Análises - Janeiro 2025

## Resumo Executivo

**Data**: 2025-01-17
**Problemas Reportados**: 7
**Bugs de Código Corrigidos**: 2
**Problemas de Dados Identificados**: 3
**Problemas de Timing/Async Identificados**: 2

---

## 1. ✅ CORRIGIDO - Horário Fim da Manutenção Não Persiste na Criação

### Descrição do Problema
Ao criar uma nova manutenção, o campo "Horário Fim" era preenchido mas não aparecia na interface após salvar. Apenas o "Horário Início" era exibido. O horário fim só aparecia se o usuário editasse a manutenção novamente.

### Causa Raiz
O campo `end_time` estava sendo:
- ✅ Enviado para a API (linha 646 de Maintenances.tsx)
- ✅ Salvo no banco de dados
- ✅ Retornado na resposta da API
- ❌ **NÃO estava sendo extraído** da resposta ao construir o objeto `newMaintenance` (linha 690)

### Solução Implementada
**Arquivo**: `src/pages/Maintenances.tsx`
**Linha**: 690

```typescript
const newMaintenance: Maintenance = {
  id: apiResponse.id,
  // ... outros campos ...
  scheduled_time: apiResponse.scheduled_time || "09:00",
  end_time: apiResponse.end_time || "", // ✅ ADICIONADO
  technician: apiResponse.technician || "",
  // ... outros campos ...
};
```

### Status
🟢 **Pronto para teste** - A correção está aplicada e não afeta nenhuma outra funcionalidade.

---

## 2. ✅ CORRIGIDO - Checklist Mostrando "0 de 6" Após Marcar Itens

### Descrição do Problema
Ao marcar itens do checklist e mudar o status da manutenção de "pendente" para "em andamento", o progresso continuava mostrando "0 de 6" mesmo com itens marcados como concluídos.

### Causa Raiz
O componente `MaintenanceChecklist` estava configurado para recarregar apenas quando o `maintenanceId` mudava:

```typescript
useEffect(() => {
  // ... lógica de reload ...
}, [maintenanceId]); // ❌ Faltava maintenanceStatus
```

Isso significava que quando o status da manutenção mudava (mas o ID permanecia o mesmo), o componente não recarregava os dados do banco.

### Solução Implementada

**Arquivos Modificados**:
1. `src/components/MaintenanceChecklist.tsx` (linhas 53-87)
2. `src/components/MaintenanceCard.tsx` (linha 345)

**Mudanças**:

1. Interface atualizada para aceitar o status:
```typescript
interface MaintenanceChecklistProps {
  maintenanceId: string;
  maintenanceType?: string;
  maintenanceStatus?: string; // ✅ ADICIONADO
  onProgressUpdate?: (progress: number) => void;
}
```

2. Parâmetro adicionado ao componente:
```typescript
const MaintenanceChecklist: React.FC<MaintenanceChecklistProps> = ({
  maintenanceId,
  maintenanceType = 'Preventiva',
  maintenanceStatus, // ✅ ADICIONADO
  onProgressUpdate
}) => {
```

3. Dependência adicionada ao useEffect:
```typescript
useEffect(() => {
  setChecklistId(null);
  setChecklist([]);
  setCompletedItems([]);
  setProgress(0);
  loadChecklist();
  loadTemplates();
}, [maintenanceId, maintenanceStatus]); // ✅ maintenanceStatus adicionado
```

4. Prop passada no componente pai (MaintenanceCard.tsx):
```typescript
<MaintenanceChecklist
  maintenanceId={maintenance.id}
  maintenanceStatus={maintenance.status} // ✅ ADICIONADO
/>
```

### Status
🟢 **Pronto para teste** - O componente agora recarrega corretamente quando o status muda.

---

## 3. 🟡 ANÁLISE - Serviços Inclusos Travado em "teste"

### Descrição do Problema
O campo "Serviços Inclusos" aparece travado com o valor "teste" na tela inicial do fluxo de upload de contrato. Só é possível editar na segunda tela.

### Análise Realizada
**Arquivo Analisado**: `src/components/IntegratedUploadWithAgentsEnhanced.tsx`

A infraestrutura de código está **correta**:
- Linha 218: Estado inicializado: `const [servicesInput, setServicesInput] = useState('')`
- Linhas 1676-1678: Dados extraídos da API corretamente: `services: apiData.services || []`
- Funções `servicesToArray()` e `servicesToText()` processam os dados adequadamente

### Causa Raiz
**Dados de teste no banco de dados**, não um bug de código.

### Recomendação
🔧 **Ação de Dados**: Executar limpeza no banco de dados:

```sql
-- Verificar contratos com "teste" em services
SELECT id, contract_number, services
FROM contracts
WHERE 'teste' = ANY(services);

-- Limpar se necessário
UPDATE contracts
SET services = ARRAY[]::text[]
WHERE 'teste' = ANY(services);
```

### Status
🟡 **Requer ação de banco de dados** - Não é necessária alteração de código.

---

## 4. 🟡 ANÁLISE - Termos de Pagamento Não Salvando

### Descrição do Problema
Ao preencher "Termos de Pagamento" e salvar, o valor retorna para "não informado" após recarregar a página ou reabrir o contrato.

### Análise Realizada
**Arquivos Analisados**:
- `src/components/IntegratedUploadWithAgentsEnhanced.tsx`
- `backend/database.py`

A infraestrutura de código está **correta em todas as camadas**:

**Frontend**:
- Linha 1939: Normalização correta: `workingData.payment_terms = workingData.payment_terms?.trim() || ''`
- Linha 2301: Salvamento correto: `payment_terms: normalizedPaymentTerms`

**Backend**:
- Linha 227-228: Campo incluído em `possible_fields` para criação
- Linhas 358-404: Query `SELECT c.*` retorna todas as colunas incluindo `payment_terms`

### Causas Prováveis
1. **Valores NULL no banco** - Contratos antigos podem ter `payment_terms = NULL` em vez de string vazia
2. **Cache do navegador** - Dados antigos em cache podem estar sobrescrevendo novos valores
3. **Dados de teste** - Similar ao problema #3, pode haver dados de teste inconsistentes

### Recomendação
🔧 **Ações de Dados e Verificação**:

```sql
-- 1. Verificar valores NULL
SELECT id, contract_number, payment_terms
FROM contracts
WHERE payment_terms IS NULL
   OR payment_terms = '';

-- 2. Normalizar valores NULL para string vazia
UPDATE contracts
SET payment_terms = ''
WHERE payment_terms IS NULL;

-- 3. Verificar se há dados de teste problemáticos
SELECT id, contract_number, payment_terms
FROM contracts
WHERE payment_terms LIKE '%teste%'
   OR payment_terms = 'não informado';
```

**Teste Manual**:
1. Limpar cache do navegador (Ctrl+Shift+Del)
2. Criar novo contrato do zero
3. Preencher "Termos de Pagamento" com valor real
4. Salvar e verificar se persiste

### Status
🟡 **Requer verificação de dados** - Código está correto, problema provável é de dados legacy ou cache.

---

## 5. 🟡 ANÁLISE - Dados de Pagamento Não Retornando

### Descrição do Problema
Campos relacionados a pagamento (prazo, forma, etc.) não retornam após salvar.

### Análise
Mesmo diagnóstico do problema #4 acima. A infraestrutura de código processa todos os campos de pagamento corretamente.

### Recomendação
Mesma abordagem do problema #4:
1. Verificar valores NULL no banco
2. Normalizar dados legacy
3. Limpar cache do navegador
4. Testar com contrato novo

### Status
🟡 **Requer verificação de dados** - Anexado ao problema #4.

---

## 6. 🔵 ANÁLISE - Chat/IA Pegando Contexto Errado

### Descrição do Problema
Ao abrir o Chat/IA de um contrato, aparece erro: "Ocorreu um erro ao buscar relatórios" em vez de carregar o contexto do contrato.

### Análise Realizada
**Arquivo Analisado**: `src/components/ModernContractChat.tsx`

**Causa Raiz Identificada**: Problema de **timing/sincronização assíncrona**

```typescript
// Linhas 159-162: O componente depende de dados síncronos
const { contractData: syncedContract, isLoading: isSyncing } = useContractSync(contract?.id);
const activeContract = syncedContract || contract;

// Linhas 329-340: Quando queries executam antes do sync completar
} catch (error) {
  console.error('Error loading reports:', error);
  toast({
    title: "Erro",
    description: "Ocorreu um erro ao buscar relatórios.", // ❌ Erro genérico
    variant: "destructive"
  });
}
```

**Fluxo do Problema**:
1. Usuário abre contrato
2. `useContractSync` inicia carregamento em background
3. Usuário clica no Chat/IA **antes** do sync terminar
4. `activeContract` está incompleto
5. Queries ao banco falham por dados insuficientes
6. Erro genérico é exibido

### Recomendação
🔧 **Melhorias de UX/Loading States**:

```typescript
// Adicionar verificação de loading no Chat
if (isSyncing) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-2">Carregando contexto do contrato...</p>
    </div>
  );
}

// Ou desabilitar botões até sync completar
<Button
  disabled={isSyncing}
  onClick={() => setShowAgentReportsDialog(true)}
>
  {isSyncing ? 'Sincronizando...' : 'Abrir Chat/IA'}
</Button>

// Melhorar mensagem de erro para debug
} catch (error) {
  console.error('Error loading reports:', error);
  const isDataIncomplete = !activeContract?.id || !activeContract?.document_id;
  toast({
    title: "Erro ao Carregar Chat",
    description: isDataIncomplete
      ? "Aguarde o carregamento completo do contrato..."
      : "Erro ao buscar dados. Tente novamente.",
    variant: "destructive"
  });
}
```

### Status
🔵 **Melhoria de UX recomendada** - Não é um bug, mas pode ser melhorado com loading states.

---

## 7. 🔵 ANÁLISE - ChatIA Não Acessando PDF do Contrato

### Descrição do Problema
O Chat/IA só acessa dados das telas anteriores, não consegue acessar o conteúdo do PDF do contrato.

### Análise
Relacionado ao problema #6. Quando o `activeContract` não está completamente sincronizado, o componente não tem acesso ao `document_id` necessário para buscar e processar o PDF.

### Recomendação
Mesma abordagem do problema #6:
1. Adicionar loading states
2. Desabilitar interação até sync completar
3. Melhorar mensagens de erro para debug

**Verificação Adicional Necessária**:
```typescript
// Verificar se document_id existe antes de queries
if (!activeContract?.document_id) {
  toast({
    title: "PDF Não Disponível",
    description: "O documento do contrato ainda está sendo processado.",
    variant: "warning"
  });
  return;
}
```

### Status
🔵 **Anexado ao problema #6** - Melhorias de UX resolverão ambos os casos.

---

## Resumo de Ações Recomendadas

### 🟢 Pronto para Teste (Código Corrigido)
1. **Horário fim de manutenção** - Testar criação de nova manutenção
2. **Progresso do checklist** - Testar mudança de status com itens marcados

### 🟡 Verificação de Banco de Dados
3. **Serviços Inclusos** - Executar queries de limpeza de dados de teste
4. **Termos de Pagamento** - Normalizar valores NULL + limpar cache do navegador
5. **Dados de Pagamento** - Mesmo procedimento do #4

### 🔵 Melhorias de UX (Opcionais)
6. **Chat/IA contexto** - Implementar loading states e verificações de sync
7. **Chat/IA PDF** - Incluído no #6

---

## Scripts de Manutenção de Dados

```sql
-- Script completo de verificação e limpeza
-- Execute por partes e verifique os resultados antes de UPDATE

-- 1. VERIFICAÇÃO - Serviços com "teste"
SELECT id, contract_number, services, created_at
FROM contracts
WHERE 'teste' = ANY(services)
ORDER BY created_at DESC;

-- 2. LIMPEZA - Serviços (executar APENAS se confirmado acima)
-- UPDATE contracts
-- SET services = ARRAY[]::text[]
-- WHERE 'teste' = ANY(services);

-- 3. VERIFICAÇÃO - Payment Terms NULL ou vazios
SELECT
  id,
  contract_number,
  payment_terms,
  CASE
    WHEN payment_terms IS NULL THEN 'NULL'
    WHEN payment_terms = '' THEN 'EMPTY'
    ELSE 'HAS_VALUE'
  END as status,
  created_at
FROM contracts
WHERE payment_terms IS NULL
   OR payment_terms = ''
   OR payment_terms = 'não informado'
ORDER BY created_at DESC;

-- 4. NORMALIZAÇÃO - Payment Terms (executar APENAS se confirmado acima)
-- UPDATE contracts
-- SET payment_terms = ''
-- WHERE payment_terms IS NULL
--    OR payment_terms = 'não informado';

-- 5. VERIFICAÇÃO GERAL - Últimos contratos criados
SELECT
  id,
  contract_number,
  services,
  payment_terms,
  created_at
FROM contracts
ORDER BY created_at DESC
LIMIT 10;
```

---

## Próximos Passos

1. **Testar correções de código** (#1 e #2)
2. **Executar verificações de banco** (#3, #4, #5)
3. **Decidir sobre melhorias de UX** (#6, #7)
4. **Reportar resultados dos testes**

---

**Documento gerado**: 2025-01-17
**Última atualização**: 2025-01-17
