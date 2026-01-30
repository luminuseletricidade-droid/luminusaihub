# Plano de Testes - Carregamento e Edição de Contratos

## 📋 Índice
1. [Configuração do Ambiente](#configuração-do-ambiente)
2. [Testes de Carregamento](#testes-de-carregamento)
3. [Testes de Edição](#testes-de-edição)
4. [Edge Cases](#edge-cases)
5. [Dados de Teste](#dados-de-teste)
6. [Console Logs e Monitoramento](#console-logs-e-monitoramento)

---

## Configuração do Ambiente

### 1. Preparação Inicial

```bash
# 1. Iniciar frontend (em um terminal)
cd "/Users/renansantos/Library/Mobile Documents/com~apple~CloudDocs/AI/Projetos/Tech Human/luminus-ai-hub"
npm run dev

# 2. Iniciar backend (em outro terminal)
cd "/Users/renansantos/Library/Mobile Documents/com~apple~CloudDocs/AI/Projetos/Tech Human/luminus-ai-hub/backend"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Verificar Conexões

```bash
# Verificar se backend está rodando
curl http://localhost:8000/health

# Verificar se frontend está acessível
curl http://localhost:5173
```

### 3. Abrir DevTools no Browser
- **Chrome/Edge**: F12 ou Cmd+Option+I (Mac)
- Ir para aba **Console**
- Ir para aba **Network** (para monitorar chamadas API)
- Filtrar por `contracts` na aba Network

---

## Testes de Carregamento

### ✅ TESTE 1: Carregamento de Contrato via Backend API

**Objetivo**: Validar que contrato carrega corretamente da API Backend

**Passos**:
1. Fazer login no sistema
2. Navegar para `/contracts`
3. Aguardar lista de contratos carregar
4. Clicar em um contrato existente
5. Na modal que abre, ir para aba "Dados do Contrato"

**Resultado Esperado**:
- ✅ Contrato carrega sem erros
- ✅ Número do contrato é exibido
- ✅ Status e tipo do contrato estão corretos
- ✅ Valor do contrato está formatado em R$

**Console Logs para Monitorar**:
```
🔍 [ContractDataEdit] Carregando dados do contrato ID via Backend API: <uuid>
📄 [ContractDataEdit] Dados do contrato carregados da API: {...}
📋 [ContractDataEdit] Dados formatados FINAIS para exibição: {...}
```

**Validação Manual**:
- Conferir se `contractData` no console possui todos os campos esperados
- Verificar se nenhum campo crítico está `null` ou `undefined`

---

### ✅ TESTE 2: Validar Campos client_* Populados

**Objetivo**: Verificar que todos os campos de cliente carregam corretamente

**Passos**:
1. Abrir um contrato (seguir passos do TESTE 1)
2. Expandir seção "Dados do Cliente"
3. Verificar cada campo

**Campos a Validar**:
- ✅ Razão Social (`client_legal_name`)
- ✅ CNPJ (`client_cnpj`)
- ✅ Email (`client_email`)
- ✅ Telefone (`client_phone`)
- ✅ Logradouro (`client_address`)
- ✅ Bairro (`client_neighborhood`)
- ✅ Número (`client_number`)
- ✅ Cidade (`client_city`)
- ✅ Estado (`client_state`)
- ✅ CEP (`client_zip_code`)

**Console Logs para Monitorar**:
```
👤 [Contracts] Cliente do contrato <número>: {
  name: "...",
  cnpj: "...",
  email: "...",
  phone: "...",
  address: "..."
}
```

**Validação Manual**:
- Abrir DevTools > Console
- Digitar: `contractData.client_name` e verificar valor
- Verificar cada campo `client_*` individualmente

---

### ✅ TESTE 3: Validar Campos equipment_* da Tabela Dedicada

**Objetivo**: Verificar que dados do equipamento vêm da tabela `equipment`

**Passos**:
1. Abrir um contrato
2. Expandir seção "Informações do Equipamento"
3. Verificar todos os campos

**Campos a Validar**:
- ✅ Tipo (`equipment_type`)
- ✅ Modelo (`equipment_model`)
- ✅ Marca (`equipment_brand`)
- ✅ Número de Série (`equipment_serial`)
- ✅ Potência (`equipment_power`)
- ✅ Tensão (`equipment_voltage`)
- ✅ Ano (`equipment_year`)
- ✅ Condição (`equipment_condition`)
- ✅ Localização (`equipment_location`)

**Console Logs para Monitorar**:
```
🔧 [ContractDataEdit] Equipamento dedicado carregado: {
  type: "...",
  model: "...",
  manufacturer: "...",
  serial_number: "..."
}
```

**Validação Manual**:
```sql
-- Executar no Supabase SQL Editor
SELECT * FROM equipment WHERE contract_id = '<contract_uuid>';
```

Comparar dados retornados com os exibidos na interface.

---

### ✅ TESTE 4: Validar Parsing de Serviços (services)

**Objetivo**: Verificar que serviços são parseados corretamente independente do formato

**Cenários de Teste**:

#### 4.1 - Serviços como Array JSON
```json
["Manutenção preventiva mensal", "Troca de óleo", "Teste de carga"]
```

#### 4.2 - Serviços como String JSON
```json
"[\"Manutenção preventiva mensal\", \"Troca de óleo\"]"
```

#### 4.3 - Serviços como String com quebras de linha
```
Manutenção preventiva mensal
Troca de óleo
Teste de carga
```

**Passos**:
1. Criar 3 contratos diferentes com cada formato acima
2. Abrir cada contrato
3. Ir para seção "Serviços Inclusos"
4. Verificar se serviços são exibidos como lista com checkmarks

**Resultado Esperado**:
- ✅ Serviços exibidos como lista com ícone ✓
- ✅ Cada serviço em uma linha separada
- ✅ Nenhum JSON "cru" visível na interface

**Console Logs para Monitorar**:
```
🔍 [SERVICES DEBUG] contractData.services: [...]
🔍 [SERVICES DEBUG] tipo: object/string
📋 [SERVICES DEBUG] servicesList final: [...]
```

---

### ✅ TESTE 5: Validar Campos Comerciais

**Objetivo**: Verificar que campos comerciais carregam corretamente

**Campos a Validar**:
- ✅ Termos de Pagamento (`payment_terms`)
- ✅ Notas Técnicas (`technical_notes`)
- ✅ Condições Especiais (`special_conditions`)
- ✅ Termos de Garantia (`warranty_terms`)

**Passos**:
1. Abrir contrato
2. Ir para seção "Informações Comerciais"
3. Verificar que cada campo exibe texto correto

**Validação Manual**:
```javascript
// No DevTools Console
console.log({
  payment_terms: contractData.payment_terms,
  technical_notes: contractData.technical_notes,
  special_conditions: contractData.special_conditions,
  warranty_terms: contractData.warranty_terms
});
```

---

### ✅ TESTE 6: Validar initialData Quando Não Tem contractId

**Objetivo**: Verificar que `initialData` é usado corretamente quando não há contractId

**Passos**:
1. Fazer upload de um novo contrato via "Upload Inteligente"
2. Aguardar extração de dados
3. Modal de edição abre automaticamente
4. Verificar que dados extraídos estão visíveis

**Resultado Esperado**:
- ✅ Dados extraídos pela IA são exibidos nos campos
- ✅ Nenhum campo obrigatório está vazio
- ✅ Possível salvar o contrato

**Console Logs para Monitorar**:
```
📋 [ContractDataEdit] Usando initialData (primeira carga): {...}
🔄 [ContractDataEdit] Dados transformados: {...}
```

---

## Testes de Edição

### ✅ TESTE 7: Editar Nome do Cliente e Salvar

**Passos**:
1. Abrir contrato existente
2. Clicar em "Editar"
3. Alterar campo "Razão Social"
4. Clicar em "Salvar"
5. Recarregar página
6. Abrir mesmo contrato

**Resultado Esperado**:
- ✅ Alteração foi salva
- ✅ Nome atualizado é exibido
- ✅ Toast de sucesso apareceu

**Validação Manual**:
```sql
SELECT client_legal_name FROM contracts WHERE id = '<uuid>';
```

---

### ✅ TESTE 8: Editar Endereço Completo

**Passos**:
1. Abrir contrato
2. Clicar em "Editar"
3. Alterar **todos** os campos de endereço:
   - CEP
   - Logradouro
   - Bairro
   - Número
   - Cidade
   - Estado
4. Clicar em "Salvar"
5. Recarregar e verificar

**Resultado Esperado**:
- ✅ Todos os campos de endereço são salvos
- ✅ CEP válido auto-completa outros campos (se implementado)
- ✅ Dados persistem após reload

**Console Logs para Monitorar**:
```
🔍 [DIAGNOSTIC] editedData BEFORE sanitization: { client_zip_code, client_address, ... }
🔍 [DIAGNOSTIC] updateData AFTER sanitization: { client_zip_code, client_address, ... }
🔍 [DIAGNOSTIC] updatedContract from Supabase: { client_zip_code, client_address, ... }
```

**Validação SQL**:
```sql
SELECT
  client_address,
  client_neighborhood,
  client_number,
  client_city,
  client_state,
  client_zip_code
FROM contracts
WHERE id = '<uuid>';
```

---

### ✅ TESTE 9: Editar Dados do Equipamento

**Objetivo**: Verificar que equipamento salva APENAS na tabela `equipment`

**Passos**:
1. Abrir contrato
2. Clicar em "Editar"
3. Alterar campos de equipamento:
   - Tipo
   - Modelo
   - Marca
   - Número de Série
   - Potência
   - Tensão
4. Salvar
5. Verificar no banco de dados

**Resultado Esperado**:
- ✅ Dados salvos na tabela `equipment`
- ✅ Tabela `contracts` NÃO tem campos equipment_* (obsoleto)
- ✅ Interface carrega dados do equipamento corretamente

**Validação SQL**:
```sql
-- Verificar equipment table
SELECT * FROM equipment WHERE contract_id = '<uuid>';

-- Verificar que contracts NÃO armazena equipment (após refatoração)
-- Os campos equipment_* em contracts são APENAS para snapshot/histórico
```

**Console Logs para Monitorar**:
```
💾 [ContractDataEdit] equipment_serial no editedData: "..."
🔧 [ContractDataEdit] Equipamento dedicado carregado: {...}
```

---

### ✅ TESTE 10: Editar Campos Comerciais

**Passos**:
1. Abrir contrato
2. Clicar em "Editar"
3. Preencher/editar todos os campos comerciais:
   - Termos de Pagamento
   - Notas Técnicas
   - Condições Especiais
   - Termos de Garantia
4. Salvar
5. Recarregar e verificar

**Resultado Esperado**:
- ✅ Todos os campos são salvos
- ✅ Texto com quebras de linha é preservado
- ✅ Campos não ficam `null` se vazios

**Console Logs para Monitorar**:
```
🔍 [DIAGNOSTIC] editedData BEFORE sanitization: { payment_terms, technical_notes, ... }
🔍 [DIAGNOSTIC] updateData AFTER sanitization: { payment_terms, technical_notes, ... }
```

---

### ✅ TESTE 11: Editar Serviços

**Passos**:
1. Abrir contrato
2. Clicar em "Editar"
3. Adicionar novo serviço
4. Editar serviço existente
5. Remover um serviço
6. Salvar
7. Recarregar

**Resultado Esperado**:
- ✅ Novo serviço adicionado
- ✅ Serviço editado atualizado
- ✅ Serviço removido não aparece
- ✅ Lista de serviços persiste após reload

**Validação SQL**:
```sql
SELECT services FROM contracts WHERE id = '<uuid>';
```

Deve retornar array JSON com serviços atualizados.

---

### ✅ TESTE 12: Validar Persistência Após Reload

**Objetivo**: Garantir que dados editados não são perdidos

**Passos**:
1. Editar múltiplos campos (cliente, equipamento, comerciais)
2. Salvar
3. **Fechar modal**
4. **Recarregar página** (F5)
5. Abrir mesmo contrato
6. Verificar todos os campos editados

**Resultado Esperado**:
- ✅ Todas as alterações persistem
- ✅ Nenhum campo volta ao valor anterior
- ✅ Dados recarregam da API corretamente

---

## Edge Cases

### ✅ TESTE 13: Contrato Sem client_id

**Cenário**: Contrato criado sem associação com cliente

**Passos**:
1. Criar contrato via backend sem `client_id`:
```python
# No backend/scripts/testing/
contract_data = {
    "contract_number": "TEST-001",
    "client_name": "Cliente Teste",
    "value": 5000.00,
    "status": "active"
    # Sem client_id
}
```
2. Tentar carregar contrato
3. Tentar editar e salvar

**Resultado Esperado**:
- ✅ Contrato carrega normalmente
- ✅ Dados do cliente vêm do snapshot em `contracts`
- ✅ Edição salva apenas em `contracts`, não cria cliente

---

### ✅ TESTE 14: Contrato Sem Equipment Record

**Cenário**: Contrato sem registro dedicado na tabela `equipment`

**Passos**:
1. Criar contrato sem equipment
2. Abrir contrato
3. Clicar em "Editar"
4. Preencher dados do equipamento
5. Salvar

**Resultado Esperado**:
- ✅ Sistema cria novo registro em `equipment`
- ✅ Equipamento fica associado ao contrato
- ✅ Dados persistem após reload

**Console Logs para Monitorar**:
```
⚠️ [ContractDataEdit] Falha ao buscar equipamento dedicado: ...
// Ao salvar:
✅ Equipamento criado com sucesso
```

---

### ✅ TESTE 15: Serviços em Diferentes Formatos

**Cenários a Testar**:

#### 15.1 - Array Vazio
```json
[]
```

#### 15.2 - String Vazia
```json
""
```

#### 15.3 - Null
```json
null
```

#### 15.4 - Array com Objetos Complexos
```json
[
  { "name": "Manutenção", "frequency": "monthly" },
  { "service": "Troca de óleo", "cost": 500 }
]
```

**Resultado Esperado**:
- ✅ Sistema não quebra com formatos inesperados
- ✅ Array vazio/null mostra "Nenhum serviço"
- ✅ Objetos complexos são convertidos para strings legíveis

---

### ✅ TESTE 16: Campos Vazios e Null Values

**Cenário**: Campos opcionais vazios ou null

**Passos**:
1. Criar contrato com campos null:
```javascript
{
  "client_address": null,
  "payment_terms": null,
  "technical_notes": "",
  "equipment_power": ""
}
```
2. Carregar contrato
3. Verificar que interface não quebra

**Resultado Esperado**:
- ✅ Campos exibem "Não informado"
- ✅ Sem erros no console
- ✅ Possível editar e preencher depois

---

## Dados de Teste

### Contrato Completo para Testes

```json
{
  "contract_number": "CONT-2025-001",
  "client_id": "<client-uuid>",
  "client_name": "Tech Solutions Ltda",
  "client_legal_name": "Tech Solutions Tecnologia Ltda",
  "client_cnpj": "12.345.678/0001-90",
  "client_email": "contato@techsolutions.com",
  "client_phone": "(11) 98765-4321",
  "client_address": "Av. Paulista, 1000",
  "client_neighborhood": "Bela Vista",
  "client_number": "1000",
  "client_city": "São Paulo",
  "client_state": "SP",
  "client_zip_code": "01310-100",
  "client_contact_person": "João Silva",
  "value": 15000.00,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "status": "active",
  "contract_type": "maintenance",
  "maintenance_frequency": "monthly",
  "services": [
    "Manutenção preventiva mensal",
    "Troca de óleo a cada 200 horas",
    "Teste de carga trimestral",
    "Fornecimento de peças e filtros"
  ],
  "payment_terms": "Pagamento mensal até o dia 10 de cada mês\nForma: Boleto ou transferência bancária\nMulta de 2% por atraso\nJuros de 1% ao mês",
  "technical_notes": "Equipamento opera em ambiente industrial\nTemperatura ambiente entre 15-35°C\nUmidade relativa máxima: 80%",
  "special_conditions": "Atendimento prioritário em até 4 horas\nDisponibilidade de técnico em regime 24x7\nPeças de reposição em estoque local",
  "warranty_terms": "Garantia de 12 meses para peças substituídas\nGarantia estendida de 24 meses para serviços\nCobertura total exceto desgaste natural"
}
```

### Equipment Data para Testes

```json
{
  "contract_id": "<contract-uuid>",
  "type": "Gerador de Energia",
  "model": "GMG 150 kVA",
  "manufacturer": "Cummins",
  "serial_number": "SN2024BR789456",
  "power": "150 kVA / 120 kW",
  "voltage": "380V / 220V",
  "year": "2024",
  "condition": "Novo",
  "location": "Av. Paulista, 1000 - São Paulo/SP"
}
```

---

## Console Logs e Monitoramento

### Logs Essenciais para Debug

Durante os testes, monitorar os seguintes logs no Console:

#### 1. Carregamento de Dados
```
✅ [Contracts] AuthContext pronto, carregando contratos...
🔍 [Contracts] Carregando contratos via Backend API...
📊 [Contracts] Dados carregados via API: <count> contratos
🔍 [ContractDataEdit] Carregando dados do contrato ID via Backend API: <uuid>
📄 [ContractDataEdit] Dados do contrato carregados da API: {...}
🔧 [ContractDataEdit] Equipamento dedicado carregado: {...}
📋 [ContractDataEdit] Dados formatados FINAIS para exibição: {...}
```

#### 2. Edição e Salvamento
```
🔧 [ContractDataEdit] Entrando em modo de edição
📋 [ContractDataEdit] Dados do contrato antes de editar: {...}
✅ [ContractDataEdit] editedData inicializado: {...}
💾 [ContractDataEdit] Salvando dados editados...
🔍 [DIAGNOSTIC] editedData BEFORE sanitization: {...}
🔍 [DIAGNOSTIC] updateData AFTER sanitization: {...}
🔍 [DIAGNOSTIC] updatedContract from Supabase: {...}
🔍 [DIAGNOSTIC] mergedData after merge: {...}
💾 [ContractDataEdit] Dados salvos e mergeados: {...}
```

#### 3. Serviços
```
🔍 [SERVICES DEBUG] contractData.services: [...]
🔍 [SERVICES DEBUG] tipo: object/string/array
📋 [SERVICES DEBUG] servicesList final: [...]
```

### Network Tab - Endpoints para Monitorar

Filtrar por `contracts` na aba Network e verificar:

```
GET /api/contracts             → Lista de contratos
GET /api/contracts/{uuid}      → Detalhes do contrato
PATCH /api/contracts/{uuid}    → Atualização do contrato
```

**Verificar**:
- ✅ Status Code: 200 OK
- ✅ Response Time: < 1s
- ✅ Response Body contém dados esperados
- ✅ Request Headers tem Authorization correto

---

## Checklist Final

### Carregamento ✅
- [ ] Contrato carrega via Backend API
- [ ] Campos client_* populados corretamente
- [ ] Campos equipment_* vêm de tabela dedicada
- [ ] Serviços parseados corretamente (array/string/JSON)
- [ ] Campos comerciais carregam
- [ ] initialData usado quando não tem contractId

### Edição ✅
- [ ] Nome do cliente edita e salva
- [ ] Endereço completo edita e persiste
- [ ] Equipamento salva APENAS em equipment table
- [ ] Campos comerciais salvam corretamente
- [ ] Serviços podem ser adicionados/editados/removidos
- [ ] Dados persistem após reload

### Edge Cases ✅
- [ ] Contrato sem client_id funciona
- [ ] Contrato sem equipment cria novo registro
- [ ] Serviços em formatos diversos não quebram
- [ ] Campos vazios/null não causam erros

### Performance e UX ✅
- [ ] Carregamento < 2s
- [ ] Salvamento < 1s
- [ ] Toasts de sucesso/erro aparecem
- [ ] Loading states visíveis
- [ ] Sem erros no console

---

## Comandos Úteis para Testes

### Backend - Criar Contrato de Teste
```python
# backend/scripts/testing/create_test_contract.py
import asyncio
from backend.database import SupabaseDB

async def create_test():
    db = SupabaseDB()

    # Criar cliente
    client = await db.create_client({
        "name": "Tech Solutions Ltda",
        "cnpj": "12.345.678/0001-90",
        "email": "teste@techsolutions.com"
    })

    # Criar contrato
    contract = await db.create_contract({
        "contract_number": "TEST-001",
        "client_id": client["id"],
        "value": 15000.00
    })

    print(f"Contrato criado: {contract['id']}")

asyncio.run(create_test())
```

### SQL - Verificar Dados
```sql
-- Ver contrato completo
SELECT * FROM contracts WHERE id = '<uuid>';

-- Ver equipamento associado
SELECT * FROM equipment WHERE contract_id = '<uuid>';

-- Ver cliente
SELECT * FROM clients WHERE id = '<client_uuid>';
```

### JavaScript Console - Debug
```javascript
// Verificar dados do contrato
console.table(contractData);

// Verificar serviços
console.log('Services:', contractData.services);

// Verificar endereço
console.log({
  address: contractData.client_address,
  city: contractData.client_city,
  state: contractData.client_state,
  zip: contractData.client_zip_code
});
```

---

## Conclusão

Este plano de testes cobre:
- ✅ **Carregamento**: 6 testes principais
- ✅ **Edição**: 6 testes principais
- ✅ **Edge Cases**: 4 cenários críticos
- ✅ **Dados de Teste**: Exemplos completos
- ✅ **Monitoramento**: Logs e Network debugging

Execute os testes em ordem sequencial para validação completa do fluxo de carregamento e edição de contratos.
