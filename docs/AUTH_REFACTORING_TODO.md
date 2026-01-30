# Refatoração de Autenticação: supabase.auth.getUser()

## Status
- ✅ **CORRIGIDO**: `src/components/MaintenanceChecklist.tsx` (3 ocorrências)
  - Linha 99: Adicionado `user` na desestruturação
  - Linha 161: Mudado `session.user.id` → `user.id`
  - Linha 665: Mudado `session.user.id` → `user.id`
  - Linha 377: Mudado `session?.user?.id` → `user?.id`
- 🔄 **PENDENTE**: 14 ocorrências em outros 10 arquivos

## 🚨 DESCOBERTA CRÍTICA - Problema Real Identificado

### Problema 1: AuthContext.session NÃO contém user (ROOT CAUSE)
```typescript
// ❌ ERRO: session NÃO tem propriedade "user"
interface Session {
  access_token: string;  // Apenas token!
}

const { session } = useAuth();
session.user.id  // ❌ TypeError: session.user is undefined
```

**SOLUÇÃO**: O hook `useAuth()` retorna `user` separadamente:
```typescript
// ✅ CORRETO
const { user, session } = useAuth();
user.id  // ✅ Funciona!
```

### Problema 2: supabase.auth.getUser() (secundário)
A aplicação usa autenticação customizada via FastAPI JWT:
- Tokens custom: `localStorage.auth_token`
- Supabase procura: `localStorage.sb-*-auth-token`
- Resultado: `null` mesmo com usuário autenticado

## Solução

Substituir `supabase.auth.getUser()` por:
- **Em componentes React**: Use `const { user, session } = useAuth()` e acesse `user.id`
- **Em hooks/utilities sem React context**: Refatorar para aceitar userId como parâmetro

**NÃO use `session.user` - isso não existe!**

## Arquivos para Corrigir (15 ocorrências)

### 1. **src/components/ModernChatHistory.tsx** (3 ocorrências)
- **Linha 69**: `const { data: { user: freshUser } } = await supabase.auth.getUser();`
- **Linha 177**: `const user = authUser || (await supabase.auth.getUser()).data.user;`
- **Linha 227**: `const user = authUser || (await supabase.auth.getUser()).data.user;`

**Ação**: Verificar se tem acesso a `useAuth()` hook. Se sim, usar `session.user`.

### 2. **src/components/ClientEditDialog.tsx** (1 ocorrência)
- **Linha 83**: `const { data: userData } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook. Se não tem acesso, refatorar.

### 3. **src/components/ContractDocumentsWithAgents.tsx** (1 ocorrência)
- **Linha 245**: `const { data: { user: currentUser } } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook.

### 4. **src/components/ChatHistory.tsx** (1 ocorrência)
- **Linha 41**: `const { data: { user } } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook.

### 5. **src/hooks/useContractExtraction.ts** (3 ocorrências)
- **Linha 278**: `const { data: userData } = await supabase.auth.getUser();`
- **Linha 324**: `const { data: userData } = await supabase.auth.getUser();`
- **Linha 498**: `const { data: userData } = await supabase.auth.getUser();`

**Ação**: Este é um hook customizado. Opções:
- A) Refatorar para usar `useAuth()` (se compatível com seu uso)
- B) Aceitar `userId` como parâmetro
- C) Refatorar para componente wrapper que injeta autenticação

### 6. **src/hooks/useImprovedChatSession.ts** (1 ocorrência)
- **Linha 54**: `const { data: { user } } = await supabase.auth.getUser();`

**Ação**: Refatorar hook para usar `useAuth()`.

### 7. **src/lib/logger.ts** (1 ocorrência)
- **Linha 166**: `const { data: { user } } = await supabase.auth.getUser();`

**Ação**: Função utility. Aceitar `userId` como parâmetro ou aceitar `session` do auth.

### 8. **src/pages/Reports.tsx** (1 ocorrência)
- **Linha 209**: `const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook (é componente React Page).

### 9. **src/pages/Profile.tsx** (1 ocorrência)
- **Linha 61**: `const { data: { user: supaUser }, error } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook (é componente React Page).

### 10. **src/pages/Cronogramas.tsx** (1 ocorrência)
- **Linha 156**: `const { data: { user } } = await supabase.auth.getUser();`

**Ação**: Usar `useAuth()` hook (é componente React Page).

### 11. **src/services/errorLogging.ts** (1 ocorrência)
- **Linha 111**: `const { data: { user } } = await supabase.auth.getUser();`

**Ação**: Serviço utility. Refatorar para aceitar `userId` como parâmetro.

---

## Prioridade de Correção

1. **ALTA** (Pages e componentes com acesso a `useAuth()`)
   - `src/pages/Reports.tsx:209`
   - `src/pages/Profile.tsx:61`
   - `src/pages/Cronogramas.tsx:156`
   - `src/components/ClientEditDialog.tsx:83`
   - `src/components/ContractDocumentsWithAgents.tsx:245`
   - `src/components/ChatHistory.tsx:41`

2. **MÉDIA** (Hooks que precisam refatoração)
   - `src/hooks/useContractExtraction.ts` (3 ocorrências)
   - `src/hooks/useImprovedChatSession.ts:54`
   - `src/components/ModernChatHistory.tsx` (3 ocorrências)

3. **BAIXA** (Utilities que precisam refatoração)
   - `src/lib/logger.ts:166`
   - `src/services/errorLogging.ts:111`

---

## Padrão de Correção

### Para Componentes React (RECOMENDADO)
```typescript
// ❌ ANTES
const { data: userData } = await supabase.auth.getUser();
if (!userData?.user?.id) {
  throw new Error('Usuário não autenticado');
}
// ... usar userData.user.id

// ✅ DEPOIS
const { session } = useAuth();
if (!session?.user?.id) {
  throw new Error('Usuário não autenticado');
}
// ... usar session.user.id
```

### Para Utilities/Services
```typescript
// ❌ ANTES
export async function logError(error: Error) {
  const { data: { user } } = await supabase.auth.getUser();
  // ... usar user.id
}

// ✅ DEPOIS
export async function logError(error: Error, userId: string) {
  // ... usar userId
}
```

---

## Cronograma

- **COMPLETADO**: MaintenanceChecklist.tsx (1 arquivo)
- **PRÓXIMAS**: Pages (3 arquivos) - ~15 minutos
- **DEPOIS**: Componentes (3 arquivos) - ~20 minutos
- **FINAL**: Hooks e Services (6 arquivos) - ~30 minutos

**Tempo total estimado**: ~65 minutos para corrigir todos os 14 arquivos restantes

---

## Testes Recomendados

Após correção de cada arquivo, testar:
1. Criação/atualização de dados (verifica autenticação)
2. Logs de erro (verifica `logger.ts`)
3. Relatórios (verifica `Reports.tsx`)
4. Perfil (verifica `Profile.tsx`)
5. Chat (verifica `ChatHistory.tsx` e `ModernChatHistory.tsx`)

