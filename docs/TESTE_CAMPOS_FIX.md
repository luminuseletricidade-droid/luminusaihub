# Teste de Correção: Campos Comerciais e Endereço

## Data da Correção: 2025-01-28

## Mudanças Aplicadas

### 1. ContractDataEdit.tsx - loadContractData()
**Arquivo:** `src/components/ContractDataEdit.tsx` (linhas 147-184)

**Antes:** Só mapeava equipment e services
**Depois:** Mapeia explicitamente:
- ✅ Campos básicos: contract_number, status, contract_type, value
- ✅ Campos de endereço: client_zip_code, client_address, client_neighborhood, client_number, client_city, client_state
- ✅ Campos comerciais: payment_terms, technical_notes, special_conditions, warranty_terms

### 2. ContractDataEdit.tsx - handleEdit()
**Arquivo:** `src/components/ContractDataEdit.tsx` (linhas 577-610)

**Mudança:** Inicializa editedData com TODOS os campos quando entra em modo de edição

---

## Plano de Testes Rápido

### Teste 1: Carregar Contrato e Verificar Campos Comerciais

**Passos:**
1. Abrir navegador DevTools (F12)
2. Ir para Console
3. Carregar um contrato existente em `http://localhost:5173/contracts`
4. Clicar para abrir um contrato
5. No console, executar:
   ```javascript
   console.log({
     payment_terms: window.contractData?.payment_terms,
     technical_notes: window.contractData?.technical_notes,
     special_conditions: window.contractData?.special_conditions,
     warranty_terms: window.contractData?.warranty_terms
   });
   ```

**Resultado Esperado:**
- Todos 4 campos devem ter valores (não undefined/null)
- OU mostrar empty string '' se não preenchido no banco

**Validação:** Log no console deve mostrar:
```
📋 [ContractDataEdit] Dados formatados FINAIS para exibição: { payment_terms: "...", technical_notes: "...", ... }
```

---

### Teste 2: Carregar Contrato e Verificar Campos de Endereço

**Passos:**
1. No console, executar:
   ```javascript
   console.log({
     client_zip_code: window.contractData?.client_zip_code,
     client_address: window.contractData?.client_address,
     client_neighborhood: window.contractData?.client_neighborhood,
     client_number: window.contractData?.client_number,
     client_city: window.contractData?.client_city,
     client_state: window.contractData?.client_state
   });
   ```

**Resultado Esperado:**
- Todos 6 campos devem estar preenchidos (se houver dados no banco)

---

### Teste 3: Editar Campos Comerciais e Salvar

**Passos:**
1. Abrir contrato existente
2. Clicar "Editar"
3. Na seção "Informações Comerciais":
   - Preencher "Termos de Pagamento": `30/60/90 dias`
   - Preencher "Notas Técnicas": `Verificar voltagem`
   - Preencher "Condições Especiais": `Contato 48h antes`
   - Preencher "Termos de Garantia": `12 meses`
4. Clicar "Salvar"
5. Verificar:
   - Toast de sucesso aparece
   - DevTools > Network: POST/PATCH request retorna 200
   - Reload página (F5)
   - Verificar que campos ainda têm os valores

**Validação:**
```sql
-- No Supabase SQL Editor
SELECT
  payment_terms,
  technical_notes,
  special_conditions,
  warranty_terms,
  updated_at
FROM contracts
WHERE id = 'seu-contract-id';
```

Todos os 4 campos devem ter os valores que você inseriu.

---

### Teste 4: Editar Campos de Endereço e Salvar

**Passos:**
1. Abrir contrato existente
2. Clicar "Editar"
3. Na seção de endereço:
   - CEP: `01310-100`
   - Endereço: `Av. Paulista`
   - Bairro: `Bela Vista`
   - Número: `1000`
   - Cidade: `São Paulo`
   - Estado: `SP`
4. Clicar "Salvar"
5. Reload página
6. Verificar campos persistem

**Validação:**
```sql
SELECT
  client_zip_code,
  client_address,
  client_neighborhood,
  client_number,
  client_city,
  client_state
FROM contracts
WHERE id = 'seu-contract-id';
```

---

### Teste 5: Editar Campos Básicos

**Passos:**
1. Abrir contrato
2. Clicar "Editar"
3. Alterar:
   - Número do Contrato: `2025-001-NOVO`
   - Tipo: selecionar outro tipo
   - Status: selecionar outro status
   - Valor: `25000.00`
4. Clicar "Salvar"
5. Reload
6. Verificar

**Validação:**
```sql
SELECT
  contract_number,
  contract_type,
  status,
  value
FROM contracts
WHERE id = 'seu-contract-id';
```

---

## Console Logs para Monitorar

Após as correções, você deve ver:

✅ **Ao carregar contrato:**
```
🔍 [ContractDataEdit] Carregando dados do contrato ID via Backend API: <uuid>
📄 [ContractDataEdit] Dados do contrato carregados da API: {
  payment_terms: "...",
  technical_notes: "...",
  special_conditions: "...",
  warranty_terms: "...",
  contract_number: "...",
  status: "...",
  contract_type: "...",
  value: ...,
  client_zip_code: "...",
  client_address: "...",
  ...
}
📋 [ContractDataEdit] Dados formatados FINAIS para exibição: {
  ... todos os campos acima ...
}
```

✅ **Ao editar:**
```
🔧 [ContractDataEdit] Entrando em modo de edição
✅ [ContractDataEdit] editedData inicializado: {
  payment_terms: "...",
  technical_notes: "...",
  ...
}
```

✅ **Ao salvar:**
```
💾 [ContractDataEdit] Salvando dados editados...
🔍 [DIAGNOSTIC] editedData BEFORE sanitization: {
  payment_terms: "...",
  technical_notes: "...",
  special_conditions: "...",
  warranty_terms: "...",
  contract_number: "...",
  ...
}
🔍 [DIAGNOSTIC] updateData AFTER sanitization: {
  payment_terms: "...",
  technical_notes: "...",
  ...
}
🔍 [DIAGNOSTIC] updatedContract from Supabase: {
  payment_terms: "...",
  technical_notes: "...",
  ...
}
```

---

## Checklist Final

- [ ] Teste 1: Campos comerciais carregam
- [ ] Teste 2: Campos de endereço carregam
- [ ] Teste 3: Campos comerciais salvam e persistem após reload
- [ ] Teste 4: Campos de endereço salvam e persistem após reload
- [ ] Teste 5: Campos básicos salvam corretamente
- [ ] Console logs mostram todos os campos em cada etapa
- [ ] Network tab mostra POST/PATCH com status 200

---

## Próximos Passos Após Testes ✅

Se todos os testes passarem:

1. **Implementar mesma lógica no popup de upload** (IntegratedUploadWithAgentsEnhanced)
2. **Testar fluxo de upload com novos campos**
3. **Commit com as correções**

## Referência

- **Arquivo modificado:** `src/components/ContractDataEdit.tsx`
- **Linhas alteradas:** 147-184 (loadContractData), 577-610 (handleEdit)
- **Campos afetados:** 16 campos adicionados ao mapeamento explícito
