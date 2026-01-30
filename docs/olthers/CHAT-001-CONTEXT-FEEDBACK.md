# BUG CHAT-001: Falta de Feedback Visual de Contexto de Documentos

## 🎯 Problema
Usuário não conseguia identificar se a IA estava realmente consultando os documentos do contrato durante as conversas. Não havia feedback visual ou indicação clara de qual contexto estava sendo utilizado.

**Transcrição**:
```
"Não consigo saber se ele pegou realmente o contexto ou não"
```

---

## ✅ Solução Implementada

### 1. **Componente DocumentContextIndicator**
`src/components/DocumentContextIndicator.tsx`

Componente visual que mostra:
- ✅ Lista de documentos disponíveis
- 📊 Status de cada documento (pronto, carregando, erro)
- 🤖 Indicador de processamento da IA
- 📈 Contadores de documentos por status
- 🔄 Expansão/Colapso da lista

**Features**:
- Feedback em tempo real
- Animações suaves
- Cores de status (verde=pronto, azul=carregando, vermelho=erro)
- Ícones visuais claros

### 2. **Hook useDocumentContext**
`src/hooks/useDocumentContext.ts`

Hook para gerenciar contexto de documentos com:
- 📁 Carregamento de documentos do contrato
- ➕ Adição de novos documentos
- 🗑️ Remoção de documentos
- 📍 Rastreamento de uso de documentos
- 📊 Log de utilização para auditoria

**Funcionalidades**:
```typescript
const {
  documents,              // Array de documentos com status
  isProcessing,           // Flag de processamento
  isLoading,             // Flag de carregamento
  loadDocuments,         // Carregar docs do contrato
  addDocument,           // Adicionar novo documento
  removeDocument,        // Remover documento
  trackDocumentUsage,    // Rastrear quando IA consulta
  clearDocuments,        // Limpar todos
  documentUsageLog       // Log de uso
} = useDocumentContext();
```

---

## 📋 Como Usar

### Integrar no ModernContractChat

```typescript
import { useDocumentContext } from '@/hooks/useDocumentContext';
import { DocumentContextIndicator } from '@/components/DocumentContextIndicator';

export const ModernContractChat = ({ contract, ...props }) => {
  const {
    documents,
    isProcessing,
    loadDocuments,
    trackDocumentUsage
  } = useDocumentContext();

  const [expandedContext, setExpandedContext] = useState(false);

  // Carregar documentos quando contrato carrega
  useEffect(() => {
    if (contract?.id) {
      loadDocuments(contract.id);
    }
  }, [contract?.id]);

  // Rastrear quando IA usa um documento
  const handleAiResponse = (response) => {
    // Quando IA processa, marcar documentos como consultados
    if (documents.length > 0) {
      documents.forEach(doc => {
        trackDocumentUsage(doc.id, inputMessage);
      });
    }
  };

  return (
    <div>
      {/* Mostrar indicador de contexto */}
      <DocumentContextIndicator
        documents={documents}
        isProcessing={isProcessing}
        expanded={expandedContext}
        onToggleExpand={() => setExpandedContext(!expandedContext)}
      />

      {/* Rest of chat UI */}
    </div>
  );
};
```

---

## 🎨 Feedback Visual

### Indicador Principal
```
📚 Contexto de Documentos
3 prontos • 1 carregando
```

### Estados de Documento
- **✓ Pronto (Verde)**: Documento disponível para consulta
- **... Carregando (Azul)**: Documento sendo processado
- **✗ Erro (Vermelho)**: Falha ao carregar documento

### Processamento IA
```
🤖 IA consultando documentos...
(com animação de pontos pulsantes)
```

---

## 📊 Rastreamento de Uso

O hook registra automaticamente:
```json
{
  "documentId": "abc123",
  "query": "Pergunta do usuário...",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

Útil para:
- 🔍 Auditoria de quais documentos foram consultados
- 📈 Análise de uso de funcionalidades
- 🐛 Debug de problemas com contexto
- 📚 Histórico de consultas

---

## ✨ Benefícios

1. **Transparência** - Usuário vê exatamente quais documentos estão sendo usados
2. **Confiança** - Indicação clara de que IA está processando contexto
3. **Rastreabilidade** - Log completo de uso de documentos
4. **Performance** - Loading states mostram progresso
5. **UX Melhorada** - Feedback visual reduz incerteza

---

## 🚀 Próximas Melhorias

1. Integração com backend para persistência de logs
2. Filtros de documentos por tipo
3. Busca em documentos antes de consultar IA
4. Visualização de snippets dos documentos consultados
5. Métricas de relevância de documentos
6. Dashboard de análise de uso

---

## 🧪 Testes Recomendados

- [ ] Verificar que DocumentContextIndicator mostra quando há documentos
- [ ] Testar expansão/colapso da lista
- [ ] Validar status de carregamento
- [ ] Confirmar que trackDocumentUsage registra corretamente
- [ ] Testar com 0, 1, 5+ documentos
- [ ] Verificar animações em diferentes browsers

---

## 📚 Referências

- `DocumentContextIndicator.tsx` - Componente visual
- `useDocumentContext.ts` - Hook de gerenciamento
- `ModernContractChat.tsx` - Local de integração
