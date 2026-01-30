import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';

interface DocumentContextItem {
  id: string;
  name: string;
  status: 'loading' | 'ready' | 'error';
  pages?: number;
  content?: string;
  url?: string;
  extractedAt?: string;
}

interface UseDocumentContextResult {
  documents: DocumentContextItem[];
  isProcessing: boolean;
  isLoading: boolean;
  loadDocuments: (contractId: string) => Promise<void>;
  addDocument: (file: File, contractId: string) => Promise<DocumentContextItem | null>;
  removeDocument: (documentId: string) => void;
  getDocumentContent: (documentId: string) => string | null;
  trackDocumentUsage: (documentId: string, query: string) => Promise<void>;
  clearDocuments: () => void;
  documentUsageLog: Array<{ documentId: string; query: string; timestamp: string }>;
}

/**
 * Hook para gerenciar contexto de documentos no chat da IA
 * Fornece feedback visual sobre quais documentos estão sendo consultados
 */
export function useDocumentContext(): UseDocumentContextResult {
  const [documents, setDocuments] = useState<DocumentContextItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [documentUsageLog, setDocumentUsageLog] = useState<Array<{ documentId: string; query: string; timestamp: string }>>([]);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Carrega documentos do contrato do Supabase
   */
  const loadDocuments = useCallback(async (contractId: string) => {
    try {
      setIsLoading(true);
      console.log('📁 Carregando documentos do contrato:', contractId);

      // Buscar lista de documentos do storage
      const { data: files, error: listError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .list(`contracts/${contractId}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error('Erro ao listar documentos:', listError);
        return;
      }

      if (!files || files.length === 0) {
        console.log('Nenhum documento encontrado para o contrato');
        setDocuments([]);
        return;
      }

      // Converter arquivos em DocumentContextItem
      const documentItems: DocumentContextItem[] = files
        .filter(file => !file.name.includes('.'))  // Filtrar pastas
        .map(file => ({
          id: file.id || file.name,
          name: file.name,
          status: 'ready' as const,
          extractedAt: file.created_at
        }));

      console.log(`✅ ${documentItems.length} documentos carregados`);
      setDocuments(documentItems);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Adiciona um novo documento ao contexto
   */
  const addDocument = useCallback(
    async (file: File, contractId: string): Promise<DocumentContextItem | null> => {
      try {
        setIsProcessing(true);

        // Criar item com status "loading"
        const documentId = `${Date.now()}-${file.name}`;
        const newDoc: DocumentContextItem = {
          id: documentId,
          name: file.name,
          status: 'loading',
          pages: undefined
        };

        setDocuments(prev => [...prev, newDoc]);
        console.log('📄 Adicionando documento:', file.name);

        // Upload para Supabase Storage
        const fileName = `contracts/${contractId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(CONTRACT_DOCUMENTS_BUCKET)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          setDocuments(prev =>
            prev.map(d => d.id === documentId ? { ...d, status: 'error' as const } : d)
          );
          return null;
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from(CONTRACT_DOCUMENTS_BUCKET)
          .getPublicUrl(fileName);

        // Atualizar documento com status "ready"
        const updatedDoc: DocumentContextItem = {
          ...newDoc,
          status: 'ready',
          url: publicUrl,
          extractedAt: new Date().toISOString()
        };

        setDocuments(prev =>
          prev.map(d => d.id === documentId ? updatedDoc : d)
        );

        console.log('✅ Documento adicionado com sucesso:', file.name);
        return updatedDoc;
      } catch (error) {
        console.error('Erro ao adicionar documento:', error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Remove um documento do contexto
   */
  const removeDocument = useCallback((documentId: string) => {
    console.log('🗑️  Removendo documento:', documentId);
    setDocuments(prev => prev.filter(d => d.id !== documentId));
  }, []);

  /**
   * Obtém o conteúdo de um documento
   */
  const getDocumentContent = useCallback((documentId: string): string | null => {
    const doc = documents.find(d => d.id === documentId);
    return doc?.content || null;
  }, [documents]);

  /**
   * Rastreia o uso de um documento na IA
   * Registra quando a IA consulta um documento específico
   */
  const trackDocumentUsage = useCallback(
    async (documentId: string, query: string) => {
      const timestamp = new Date().toISOString();
      const usageEntry = { documentId, query, timestamp };

      console.log('📍 Rastreando uso de documento:', {
        documentId,
        query: query.substring(0, 100) + '...',
        timestamp
      });

      // Adicionar ao log local
      setDocumentUsageLog(prev => [...prev, usageEntry]);

      // Marcar documento como em processamento
      setDocuments(prev =>
        prev.map(d =>
          d.id === documentId && d.status !== 'error'
            ? { ...d, status: 'loading' as const }
            : d
        )
      );

      // Simular processamento (será substituído por chamada real ao backend)
      // No futuro, isso pode registrar em banco de dados para auditoria
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      processingTimeoutRef.current = setTimeout(() => {
        setDocuments(prev =>
          prev.map(d =>
            d.id === documentId && d.status === 'loading'
              ? { ...d, status: 'ready' as const }
              : d
          )
        );
      }, 2000);
    },
    []
  );

  /**
   * Limpa todos os documentos
   */
  const clearDocuments = useCallback(() => {
    console.log('🧹 Limpando todos os documentos');
    setDocuments([]);
    setDocumentUsageLog([]);
  }, []);

  /**
   * Limpar timeout ao desmontar
   */
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  return {
    documents,
    isProcessing,
    isLoading,
    loadDocuments,
    addDocument,
    removeDocument,
    getDocumentContent,
    trackDocumentUsage,
    clearDocuments,
    documentUsageLog
  };
}

export default useDocumentContext;
