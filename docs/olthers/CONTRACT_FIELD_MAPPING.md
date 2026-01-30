# Contract Field Mapping Documentation

## Overview

Este documento detalha o mapeamento completo entre os campos retornados pela API e os campos exibidos/editados nos componentes de UI, especificamente para o fluxo de contratos.

**Componentes principais:**
- **Backend API**: `/api/contracts/{id}` (main.py → database.py)
- **UI Component**: `ContractDataEdit.tsx`
- **Types**: `src/types/index.ts` (ExtendedContract)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────┤
│  contracts table     │   clients table    │   equipment table   │
│  - Basic contract    │   - Client info    │   - Equipment data  │
│  - Embedded client   │   - Address        │   - Specs           │
│  - Commercial info   │   - Contact        │   - Location        │
└──────────┬───────────┴────────────┬────────┴────────────┬────────┘
           │                        │                      │
           ▼                        ▼                      ▼
    ┌──────────────────────────────────────────────────────────┐
    │           database.py :: get_contract()                   │
    │  Query consolidates: contracts ⟗ clients ⟗ equipment    │
    │  Returns: merged dictionary with COALESCE priority       │
    └──────────────────────────┬───────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   FastAPI Response   │
                    │   JSON serialized    │
                    └──────────┬───────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │    ContractDataEdit.tsx              │
            │  - loadContractData()                │
            │  - Transform API → ExtendedContract  │
            │  - Display/Edit fields               │
            └──────────────────────────────────────┘
```

---

## 1. CAMPOS BÁSICOS DO CONTRATO

### API Response → UI Component

| API Field | UI Field | Type | Source Table | Transformation | Notes |
|-----------|----------|------|--------------|----------------|-------|
| `id` | `id` | string (UUID) | contracts | None | Primary key |
| `contract_number` | `contract_number` | string | contracts | None | Editable |
| `value` | `value` | number | contracts | None | Displayed as BRL currency |
| `monthly_value` | `monthly_value` | number | contracts | None | Optional monthly installment |
| `duration_months` | `duration_months` | number | contracts | None | Contract duration |
| `start_date` | `start_date` | string (ISO) | contracts | `toBRDateString()` | Display: dd/mm/yyyy |
| `end_date` | `end_date` | string (ISO) | contracts | `toBRDateString()` | Display: dd/mm/yyyy |
| `status` | `status` | string | contracts | None | Values: active, inactive, expired, renewal, draft |
| `contract_type` | `contract_type` | string | contracts | None | Values: maintenance, rental, hybrid |
| `maintenance_frequency` | `maintenance_frequency` | string | contracts | None | Values: weekly, biweekly, monthly, quarterly, semiannual, annual |
| `created_at` | `created_at` | string (ISO) | contracts | `toBRDateString()` | Read-only |
| `updated_at` | `updated_at` | string (ISO) | contracts | `toBRDateString()` | Read-only |

---

## 2. CAMPOS DE CLIENTE

### Consolidation Strategy

A API usa `COALESCE(clients.field, contracts.field)` para priorizar dados da tabela `clients`, mas mantém fallback para campos embedded em `contracts`.

### API Response → UI Component

| API Field | UI Field | Type | Source Priority | Transformation | Notes |
|-----------|----------|------|-----------------|----------------|-------|
| `client_id` | `client_id` | string (UUID) | contracts | None | FK to clients table |
| `client_name` | `client_name` | string | COALESCE(clients.name, contracts.client_name) | None | Nome fantasia (AI-extracted) |
| `client_legal_name` | `client_legal_name` | string | COALESCE(clients.name, contracts.client_legal_name) | None | Razão social (primary from DB) |
| `client_cnpj` | `client_cnpj` | string | COALESCE(clients.cnpj, contracts.client_cnpj) | None | Format: 00.000.000/0001-00 |
| `client_email` | `client_email` | string | COALESCE(clients.email, contracts.client_email) | None | Contact email |
| `client_phone` | `client_phone` | string | COALESCE(clients.phone, contracts.client_phone) | None | Contact phone |
| `client_address` | `client_address` | string | COALESCE(clients.address, contracts.client_address) | None | Street address |
| `client_neighborhood` | `client_neighborhood` | string | COALESCE(clients.neighborhood, contracts.client_neighborhood) | None | Neighborhood/district |
| `client_number` | `client_number` | string | COALESCE(clients.number, contracts.client_number) | None | Street number |
| `client_city` | `client_city` | string | COALESCE(clients.city, contracts.client_city) | None | City name |
| `client_state` | `client_state` | string | COALESCE(clients.state, contracts.client_state) | None | State abbreviation (e.g., SP) |
| `client_zip_code` | `client_zip_code` | string | COALESCE(clients.zip_code, contracts.client_zip_code) | None | CEP format: 00000-000 |
| `client_contact_person` | `client_contact_person` | string | COALESCE(clients.contact_person, contracts.client_contact_person) | None | Primary contact name |

### Save Flow (Client Updates)

Quando `client_id` existe, a atualização propaga para AMBAS as tabelas:

```typescript
// 1. Update clients table
UPDATE clients SET
  name = client_legal_name,
  cnpj = client_cnpj,
  email = client_email,
  phone = client_phone,
  address = client_address,
  neighborhood = client_neighborhood,
  number = client_number,
  city = client_city,
  state = client_state,
  zip_code = client_zip_code,
  contact_person = client_contact_person
WHERE id = client_id;

// 2. Update contracts table (embedded fallback)
UPDATE contracts SET
  client_name = client_name,
  client_legal_name = client_legal_name,
  client_cnpj = client_cnpj,
  ...
WHERE id = contract_id;
```

---

## 3. CAMPOS DE EQUIPAMENTO

### IMPORTANTE: Equipment Table is Source of Truth

**MUDANÇA ARQUITETURAL (2025):**
- Equipamentos NÃO SÃO mais armazenados em `contracts` table
- Tabela dedicada `equipment` é a única fonte de verdade
- Query de leitura DEVE buscar de `equipment` via `contract_id`
- Salvamento ATUALIZA ou INSERE em `equipment` table

### API Response → UI Component

| API Field | UI Field | Type | Source Table | Notes |
|-----------|----------|------|--------------|-------|
| `equipment_type` | `equipment_type` | string | equipment.type | e.g., "Gerador" |
| `equipment_model` | `equipment_model` | string | equipment.model | e.g., "GMG 150" |
| `equipment_brand` | `equipment_brand` | string | equipment.manufacturer | e.g., "Cummins" |
| `equipment_serial` | `equipment_serial` | string | equipment.serial_number | e.g., "SN2024BR789456" |
| `equipment_power` | `equipment_power` | string | equipment.power | e.g., "150 kVA" |
| `equipment_voltage` | `equipment_voltage` | string | equipment.voltage | e.g., "380V" |
| `equipment_location` | `equipment_location` | string | equipment.location | Installation address |
| `equipment_year` | `equipment_year` | string | equipment.year | e.g., "2024" |
| `equipment_condition` | `equipment_condition` | string | equipment.condition | e.g., "Novo", "Usado" |

### Save Flow (Equipment Updates)

```typescript
// Load equipment record first
const equipment = await supabase
  .from('equipment')
  .select('*')
  .eq('contract_id', contractId)
  .maybeSingle();

if (equipment?.id) {
  // UPDATE existing equipment
  await supabase
    .from('equipment')
    .update({
      type: equipment_type,
      model: equipment_model,
      manufacturer: equipment_brand,
      serial_number: equipment_serial,
      power: equipment_power,
      voltage: equipment_voltage,
      location: equipment_location,
      year: equipment_year,
      condition: equipment_condition
    })
    .eq('id', equipment.id);
} else {
  // INSERT new equipment
  await supabase
    .from('equipment')
    .insert({
      contract_id: contractId,
      type: equipment_type,
      model: equipment_model,
      manufacturer: equipment_brand,
      serial_number: equipment_serial,
      power: equipment_power,
      voltage: equipment_voltage,
      location: equipment_location,
      year: equipment_year,
      condition: equipment_condition
    });
}
```

---

## 4. CAMPOS COMERCIAIS

### API Response → UI Component

| API Field | UI Field | Type | Source Table | Notes |
|-----------|----------|------|--------------|-------|
| `payment_terms` | `payment_terms` | string (multiline) | contracts | e.g., "30/60/90 dias" |
| `technical_notes` | `technical_notes` | string (multiline) | contracts | Technical specifications |
| `special_conditions` | `special_conditions` | string (multiline) | contracts | Special clauses |
| `warranty_terms` | `warranty_terms` | string (multiline) | contracts | Warranty coverage |
| `description` | `description` or `observations` | string (multiline) | contracts | General notes |

**Display:** These fields use `AutoResizeTextarea` with `whitespace-pre-wrap` to preserve line breaks.

---

## 5. CAMPOS DE SERVIÇOS

### Parsing Rules

O campo `services` pode vir em diferentes formatos da API:

1. **Array** (preferido): `["Manutenção preventiva", "Suporte 24/7"]`
2. **String JSON**: `'["Manutenção preventiva", "Suporte 24/7"]'`
3. **String com quebras de linha**: `"Manutenção preventiva\nSuporte 24/7"`

### Parse Function

```typescript
function parseServicesField(servicesField: string[] | string | null): string[] {
  if (!servicesField) return [];

  if (Array.isArray(servicesField)) {
    return servicesField
      .map(s => typeof s === 'string' ? s.trim() : '')
      .filter(s => s.length > 0);
  }

  if (typeof servicesField === 'string') {
    try {
      const parsed = JSON.parse(servicesField);
      if (Array.isArray(parsed)) {
        return parsed
          .map(s => typeof s === 'string' ? s.trim() : '')
          .filter(s => s.length > 0);
      }
    } catch {
      // Not JSON, treat as newline-separated
      return servicesField
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
  }

  return [];
}
```

### Save Format

Serviços são salvos como **JSON array** na tabela `contracts`:

```sql
UPDATE contracts SET
  services = '["Manutenção preventiva", "Suporte 24/7", "Troca de óleo"]'::jsonb
WHERE id = contract_id;
```

### UI Display

- **View mode**: Lista de itens com checkmarks
- **Edit mode**: Lista editável + campo "Adicionar novo serviço"

---

## 6. EXEMPLOS PRÁTICOS

### 6.1. Exemplo de API Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contract_number": "CONT-2025-001",
  "value": 15000.00,
  "monthly_value": 1500.00,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "status": "active",
  "contract_type": "maintenance",
  "maintenance_frequency": "monthly",

  "client_id": "660e8400-e29b-41d4-a716-446655440001",
  "client_name": "Tech Solutions",
  "client_legal_name": "Tech Solutions Ltda",
  "client_cnpj": "12.345.678/0001-90",
  "client_email": "contato@techsolutions.com",
  "client_phone": "(11) 98765-4321",
  "client_address": "Av. Paulista, 1000",
  "client_neighborhood": "Bela Vista",
  "client_number": "1000",
  "client_city": "São Paulo",
  "client_state": "SP",
  "client_zip_code": "01310-100",

  "equipment_type": "Gerador",
  "equipment_model": "GMG 150",
  "equipment_brand": "Cummins",
  "equipment_serial": "SN2024BR789456",
  "equipment_power": "150 kVA",
  "equipment_voltage": "380V",
  "equipment_location": "Subsolo - Sala de Máquinas",
  "equipment_year": "2024",
  "equipment_condition": "Novo",

  "services": ["Manutenção preventiva mensal", "Suporte 24/7", "Troca de óleo a cada 250h"],

  "payment_terms": "Pagamento em 3x (30/60/90 dias)\nDesconto de 5% para pagamento à vista",
  "technical_notes": "Equipamento requer óleo Mobil Delvac 15W40",
  "special_conditions": "Manutenção deve ser agendada com 48h de antecedência",
  "warranty_terms": "Garantia de 12 meses para peças e mão de obra",
  "description": "Contrato de manutenção preventiva de gerador",

  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:45:00Z"
}
```

### 6.2. Exemplo de Estado Interno (editedData)

```typescript
const editedData: ExtendedContract = {
  // Inherited from API response
  id: "550e8400-e29b-41d4-a716-446655440000",
  contract_number: "CONT-2025-001",
  value: 15000.00,

  // Client fields (flattened)
  client_id: "660e8400-e29b-41d4-a716-446655440001",
  client_name: "Tech Solutions",
  client_legal_name: "Tech Solutions Ltda",
  client_cnpj: "12.345.678/0001-90",
  client_email: "contato@techsolutions.com",
  client_phone: "(11) 98765-4321",
  client_address: "Av. Paulista, 1000",
  client_neighborhood: "Bela Vista",
  client_number: "1000",
  client_city: "São Paulo",
  client_state: "SP",
  client_zip_code: "01310-100",

  // Equipment fields (from equipment table)
  equipment_type: "Gerador",
  equipment_model: "GMG 150",
  equipment_brand: "Cummins",
  equipment_serial: "SN2024BR789456",
  equipment_power: "150 kVA",
  equipment_voltage: "380V",
  equipment_location: "Subsolo - Sala de Máquinas",
  equipment_year: "2024",
  equipment_condition: "Novo",

  // Services (parsed array)
  services: [
    "Manutenção preventiva mensal",
    "Suporte 24/7",
    "Troca de óleo a cada 250h"
  ],

  // Commercial info
  payment_terms: "Pagamento em 3x (30/60/90 dias)\nDesconto de 5% para pagamento à vista",
  technical_notes: "Equipamento requer óleo Mobil Delvac 15W40",
  special_conditions: "Manutenção deve ser agendada com 48h de antecedência",
  warranty_terms: "Garantia de 12 meses para peças e mão de obra",
  description: "Contrato de manutenção preventiva de gerador"
}
```

### 6.3. Exemplo de Payload ao Salvar

```typescript
// 1. Update contracts table
const contractUpdateData = {
  contract_number: "CONT-2025-001",
  client_name: "Tech Solutions",
  client_legal_name: "Tech Solutions Ltda",
  client_cnpj: "12.345.678/0001-90",
  client_email: "contato@techsolutions.com",
  client_phone: "(11) 98765-4321",
  client_address: "Av. Paulista, 1000",
  client_neighborhood: "Bela Vista",
  client_number: "1000",
  client_city: "São Paulo",
  client_state: "SP",
  client_zip_code: "01310-100",
  value: 15000.00,
  start_date: "2025-01-01",
  end_date: "2025-12-31",
  status: "active",
  contract_type: "maintenance",
  maintenance_frequency: "monthly",
  services: ["Manutenção preventiva mensal", "Suporte 24/7"],
  payment_terms: "Pagamento em 3x...",
  technical_notes: "Equipamento requer...",
  special_conditions: "Manutenção deve ser...",
  warranty_terms: "Garantia de 12 meses...",
  description: "Contrato de manutenção...",
  updated_at: "2025-01-20T14:45:00Z"
};

// 2. Update clients table (if client_id exists)
const clientUpdateData = {
  name: "Tech Solutions Ltda",
  cnpj: "12.345.678/0001-90",
  email: "contato@techsolutions.com",
  phone: "(11) 98765-4321",
  address: "Av. Paulista, 1000",
  neighborhood: "Bela Vista",
  number: "1000",
  city: "São Paulo",
  state: "SP",
  zip_code: "01310-100",
  contact_person: null,
  updated_at: "2025-01-20T14:45:00Z"
};

// 3. Update equipment table (if equipment exists)
const equipmentUpdateData = {
  type: "Gerador",
  model: "GMG 150",
  manufacturer: "Cummins",
  serial_number: "SN2024BR789456",
  location: "Subsolo - Sala de Máquinas",
  year: "2024",
  condition: "Novo",
  power: "150 kVA",
  voltage: "380V",
  updated_at: "2025-01-20T14:45:00Z"
};
```

---

## 7. DATA PERSISTENCE LOCATIONS

### Where Each Field is Stored

| Field Category | Primary Table | Fallback Table | Notes |
|----------------|---------------|----------------|-------|
| Contract basics | `contracts` | - | Single source |
| Client info | `clients` | `contracts` (embedded) | COALESCE priority |
| Equipment | `equipment` | - | **NO embedded fields in contracts** |
| Services | `contracts.services` | - | JSONB array |
| Commercial text | `contracts` | - | payment_terms, technical_notes, etc. |
| Timestamps | `contracts` | - | created_at, updated_at |

### Multi-Table Update Strategy

```typescript
async function saveContract(contractId: string, editedData: ExtendedContract) {
  // 1. Update contracts table (always)
  await updateContractsTable(contractId, editedData);

  // 2. Update clients table (if client_id exists)
  if (editedData.client_id) {
    await updateClientsTable(editedData.client_id, editedData);
  }

  // 3. Update or insert equipment (dedicated table)
  const existingEquipment = await findEquipment(contractId);
  if (existingEquipment?.id) {
    await updateEquipmentTable(existingEquipment.id, editedData);
  } else if (hasEquipmentData(editedData)) {
    await insertEquipmentTable(contractId, editedData);
  }

  // 4. Reload consolidated data
  await loadContractData(contractId);
}
```

---

## 8. TRANSFORMAÇÕES ESPECIAIS

### 8.1. Date Formatting

```typescript
// API → UI (display)
function formatDate(date: string | null | undefined): string {
  const formatted = toBRDateString(date);
  return formatted || 'Não definido';
}

// UI → API (save)
// DatePicker component handles ISO string conversion automatically
```

### 8.2. Currency Formatting

```typescript
// API → UI (display)
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

// UI → API (save)
function parseNumericField(value?: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return !Number.isNaN(parsed) ? parsed : null;
  }
  return null;
}
```

### 8.3. Status Translation

```typescript
const statusMap = {
  'active': 'Ativo',
  'inactive': 'Inativo',
  'expired': 'Expirado',
  'renewal': 'Em Renovação',
  'draft': 'Rascunho'
};

const frequencyMap = {
  'weekly': 'Semanal',
  'biweekly': 'Quinzenal',
  'monthly': 'Mensal',
  'quarterly': 'Trimestral',
  'semiannual': 'Semestral',
  'annual': 'Anual'
};

const typeMap = {
  'maintenance': 'Manutenção',
  'rental': 'Locação',
  'hybrid': 'Híbrido'
};
```

---

## 9. FIELD VALIDATION RULES

### Required Fields

- `client_name` OR `client_legal_name` (at least one)
- Equipment fields are optional, but if provided, all are saved

### Sanitization

```typescript
function sanitizeString(raw?: string | null): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.toString().trim();
  return trimmed.length > 0 ? trimmed : null;
}
```

### Address Fields

**CRITICAL:** Address fields use `.trim() || null` instead of `sanitizeString()` to preserve empty strings as null without losing data:

```typescript
// ✅ CORRECT
client_address: editedData.client_address?.trim() || null,
client_neighborhood: editedData.client_neighborhood?.trim() || null,
client_number: editedData.client_number?.trim() || null,
client_city: editedData.client_city?.trim() || null,
client_state: editedData.client_state?.trim() || null,
client_zip_code: editedData.client_zip_code?.trim() || null,

// ❌ WRONG (causes data loss)
client_address: sanitizeString(editedData.client_address),
```

---

## 10. TYPE REFERENCE

### ExtendedContract Interface

See `/Users/renansantos/Library/Mobile Documents/com~apple~CloudDocs/AI/Projetos/Tech Human/luminus-ai-hub/src/types/index.ts` lines 173-227 for complete type definition.

**Key differences from base Contract:**
- Flattened client fields (client_name, client_cnpj, etc.)
- Flattened equipment fields (equipment_type, equipment_model, etc.)
- Extended commercial fields (payment_terms, technical_notes, etc.)
- Array-typed services field

---

## 11. DEBUGGING CHECKLIST

### API Response Issues

1. Check `database.py::get_contract()` query
2. Verify COALESCE logic for client fields
3. Ensure equipment JOIN is working
4. Check serialization (`clean_result()` method)

### UI Display Issues

1. Verify `loadContractData()` transformation
2. Check `parseServicesField()` for services
3. Ensure equipment record is loaded separately
4. Validate date formatting with `toBRDateString()`

### Save Issues

1. Check `handleSave()` payload construction
2. Verify address field sanitization (use `.trim() || null`)
3. Ensure equipment table upsert logic
4. Confirm client table update when client_id exists

---

## 12. REVISION HISTORY

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-28 | 1.0.0 | AI Assistant | Initial documentation |

---

## APPENDIX: Related Files

- **Type Definitions**: `src/types/index.ts`
- **UI Component**: `src/components/ContractDataEdit.tsx`
- **API Endpoint**: `backend/main.py` (line 1258)
- **Database Layer**: `backend/database.py` (line 410)
- **Address Component**: `src/components/AddressFormWithCep.tsx`
- **Date Utilities**: `src/utils/dateUtils.ts`
