import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentDocument {
  id: string;
  agent_type: 'manutencao' | 'documentacao' | 'cronogramas' | 'relatorios';
  title: string;
  content: unknown;
  status: 'pending' | 'generating' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  metadata?: unknown;
}

export interface UseAgentDocumentsProps {
  contractId: string;
  autoLoad?: boolean;
}

export function useAgentDocuments({ contractId, autoLoad = true }: UseAgentDocumentsProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Map<string, AgentDocument>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all documents for a contract
  const loadDocuments = useCallback(async () => {
    if (!contractId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (loadError) throw loadError;

      if (data) {
        const docsMap = new Map<string, AgentDocument>();

        // Add all documents to map, using category as key
        data.forEach(doc => {
          // Parse content from description if it's stored as JSON
          let content = doc.description;
          let title = doc.name;

          if (doc.description && doc.description.startsWith('{')) {
            try {
              const parsed = JSON.parse(doc.description);
              content = parsed.generated_content || parsed;
              title = doc.name || parsed.title || title;
            } catch (e) {
              // Keep original content if not JSON
            }
          }

          if (doc.category) {
            docsMap.set(doc.category, {
              id: doc.id,
              agent_type: doc.category as unknown,
              title: title,
              content: content,
              status: 'completed',
              created_at: doc.created_at,
              updated_at: doc.updated_at || doc.created_at,
              metadata: doc
            });
          }
        });

        setDocuments(docsMap);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar documentos';
      setError(errorMessage);
      toast({
        title: "Erro ao carregar documentos",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [contractId, toast]);

  // Save or update a document
  const saveDocument = async (
    agentType: string,
    document: Partial<AgentDocument>,
    userId: string
  ): Promise<boolean> => {
    try {
      // Check if document already exists
      const { data: existing } = await supabase
        .from('generated_reports')
        .select('id')
        .eq('contract_id', contractId)
        .eq('agent_type', agentType)
        .single();

      let result;

      if (existing) {
        // Update existing document
        result = await supabase
          .from('generated_reports')
          .update({
            title: document.title,
            content: document.content,
            status: document.status || 'completed',
            metadata: document.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new document
        result = await supabase
          .from('generated_reports')
          .insert({
            contract_id: contractId,
            agent_type: agentType,
            title: document.title,
            content: document.content,
            status: document.status || 'completed',
            metadata: document.metadata,
            user_id: userId
          });
      }

      if (result.error) throw result.error;

      // Update local state
      const newDoc: AgentDocument = {
        id: existing?.id || crypto.randomUUID(),
        agent_type: agentType as AgentDocument['agent_type'],
        title: document.title || '',
        content: document.content,
        status: (document.status || 'completed') as AgentDocument['status'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: document.metadata
      };

      setDocuments(prev => {
        const updated = new Map(prev);
        updated.set(agentType, newDoc);
        return updated;
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar documento';
      toast({
        title: "Erro ao salvar documento",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  // Save multiple documents at once
  const saveMultipleDocuments = async (
    documentsToSave: Array<{ agentType: string; document: Partial<AgentDocument> }>,
    userId: string
  ): Promise<number> => {
    let savedCount = 0;

    for (const { agentType, document } of documentsToSave) {
      const success = await saveDocument(agentType, document, userId);
      if (success) savedCount++;
    }

    if (savedCount > 0) {
      toast({
        title: "Documentos salvos",
        description: `${savedCount} documento(s) salvos com sucesso`,
      });
    }

    return savedCount;
  };

  // Delete a document
  const deleteDocument = async (agentType: string): Promise<boolean> => {
    try {
      const doc = documents.get(agentType);
      if (!doc) return false;

      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('contract_id', contractId)
        .eq('agent_type', agentType);

      if (error) throw error;

      // Update local state
      setDocuments(prev => {
        const updated = new Map(prev);
        updated.delete(agentType);
        return updated;
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir documento';
      toast({
        title: "Erro ao excluir documento",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  // Get a specific document by agent type
  const getDocument = (agentType: string): AgentDocument | undefined => {
    return documents.get(agentType);
  };

  // Check if all selected agents have documents
  const checkAllDocumentsGenerated = (selectedAgents: Set<string>): boolean => {
    for (const agent of selectedAgents) {
      if (!documents.has(agent)) {
        return false;
      }
    }
    return true;
  };

  // Real-time subscription for updates
  useEffect(() => {
    if (!contractId) return;

    const subscription = supabase
      .channel(`documents-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_reports',
          filter: `contract_id=eq.${contractId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const doc = payload.new;
            setDocuments(prev => {
              const updated = new Map(prev);
              updated.set(doc.agent_type, {
                id: doc.id,
                agent_type: doc.agent_type,
                title: doc.title,
                content: doc.content,
                status: doc.status || 'completed',
                created_at: doc.created_at,
                updated_at: doc.updated_at,
                metadata: doc.metadata
              });
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const doc = payload.old;
            setDocuments(prev => {
              const updated = new Map(prev);
              updated.delete(doc.agent_type);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contractId]);

  // Auto-load documents on mount or contract change
  useEffect(() => {
    if (autoLoad) {
      loadDocuments();
    }
  }, [autoLoad, loadDocuments]);

  return {
    documents,
    loading,
    error,
    loadDocuments,
    saveDocument,
    saveMultipleDocuments,
    deleteDocument,
    getDocument,
    checkAllDocumentsGenerated,
    documentsArray: Array.from(documents.values()),
    documentsByType: Object.fromEntries(documents)
  };
}