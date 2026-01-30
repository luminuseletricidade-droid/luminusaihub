import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { formatDateSafe } from '@/utils/formatters'
import { API_BASE_URL } from '@/config/api.config'
import { 
  Settings, 
  Maximize2, 
  Minimize2, 
  MessageSquarePlus, 
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Play,
  Pause,
  X,
  Download,
  Eye,
  Trash2,
  Users,
  Brain,
  Sparkles,
  FileAudio,
  Calendar,
  Clock,
  Building,
  MapPin,
  Plus,
  ChevronUp,
  ChevronDown,
  FileStack,
  AlertCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useContractSync } from '@/hooks/useContractSync';
import { useChatSession } from '@/hooks/useChatSession';
import { agentRouter } from '@/lib/langraph/agents';
import { ModernChatHistory } from './ModernChatHistory';
import { usePdfReader } from '@/hooks/usePdfReader';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FormattedMessage } from './FormattedMessage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { prepareEnhancedSearchQuery } from '@/utils/fuzzySearch';

interface ModernContractChatProps {
  contract: unknown;
  onBack: () => void;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
  showHeader?: boolean;
  fileContext?: {
    file: {
      name: string;
      size: number;
      content: string;
      type: string;
    };
    enabled: boolean;
  } | null;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  url?: string;
  storage_path?: string;
}

const normalizeServices = (services: unknown): string[] => {
  if (!services) return [];
  if (Array.isArray(services)) {
    return services
      .map(service =>
        typeof service === 'string'
          ? service
          : service?.service_name || service?.name || service?.description || ''
      )
      .map(item => item.trim())
      .filter(Boolean);
  }
  if (typeof services === 'string') {
    return services
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  if (typeof services === 'object') {
    return [services.service_name || services.name || services.description || ''].filter(Boolean);
  }
  return [];
};

export const ModernContractChat = ({ 
  contract, 
  onBack, 
  onToggleMaximize, 
  isMaximized = false,
  showHeader = true,
  fileContext
}: ModernContractChatProps) => {
  const { user, session, loading: authLoading } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('contract-extractor');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [persistentAttachments, setPersistentAttachments] = useState<UploadedFile[]>([]);
  const [excludedContractDocs, setExcludedContractDocs] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false); // Iniciar fechado, botão para abrir
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showAgentReportsDialog, setShowAgentReportsDialog] = useState(false);
  const [availableReports, setAvailableReports] = useState<unknown[]>([]);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [loadingReports, setLoadingReports] = useState(false);
  const [hasReports, setHasReports] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const excludedContractDocsKey = useMemo(
    () => Array.from(excludedContractDocs).sort().join('|'),
    [excludedContractDocs]
  );

  // Use o hook useContractSync para obter dados completos e atualizados
  const { contractData: syncedContract, isLoading: isSyncing } = useContractSync(contract?.id);

  // Use syncedContract se disponível, caso contrário use o contract original
  const activeContract = syncedContract || contract;

  // Use chat session management with contract ID
  const contractKey = activeContract?.id || contract?.id || contract?.contract_number || 'no-contract';
  const {
    currentSession,
    isLoading: isSaving,
    forceNewSession,
    addMessage,
    loadSessionFromDatabase,
    clearCurrentSession,
    getOrMaintainSession,
    loadMostRecentSession
  } = useChatSession(contractKey);

  // Local state to control AI processing indicator
  const [isAiProcessing, setIsAiProcessing] = useState(() => {
    // Restore AI processing state from localStorage on component mount
    const savedState = localStorage.getItem(`aiProcessing_${contractKey}`);
    return savedState === 'true';
  });
  const [isUsingContext, setIsUsingContext] = useState(false);

  const { readAndExtract, extractContractFromFile, readPdfFromStorage } = usePdfReader();

  // Effect to persist AI processing state in localStorage
  useEffect(() => {
    localStorage.setItem(`aiProcessing_${contractKey}`, isAiProcessing.toString());
  }, [isAiProcessing, contractKey]);

  // Function to reset AI processing state
  const resetAiProcessingState = useCallback(() => {
    setIsAiProcessing(false);
    localStorage.setItem(`aiProcessing_${contractKey}`, 'false');
  }, [contractKey]);

  // Effect to clean up AI processing state when component unmounts or contract changes
  useEffect(() => {
    return () => {
      // Clean up on unmount
      resetAiProcessingState();
    };
  }, [resetAiProcessingState]);

  useEffect(() => {
    // Only clear uploaded files, keep persistent attachments
    setUploadedFiles([]);
    // Don't clear persistentAttachments to maintain context
  }, [contractKey]);

  // Auto-attach functionality desativada – o contexto vem do banco, anexos são opcionais

  // Function to load available reports and show dialog
  const openAgentReportsDialog = async () => {
    // Verificar se contrato está completamente carregado
    if (!activeContract?.id || isSyncing) {
      toast({
        title: "Aguarde a sincronização",
        description: "O contrato ainda está sendo carregado. Por favor, aguarde alguns segundos.",
        variant: "default"
      });
      return;
    }

    setLoadingReports(true);
    setShowAgentReportsDialog(true);

    try {
      // Debug info
      console.log('Looking for reports for contract:', {
        id: activeContract?.id,
        contract_number: activeContract?.contract_number,
        client_name: activeContract?.client_name
      });

      let allReports = [];

      const agentTypeNames: Record<string, string> = {
        manutencao: 'Plano de Manutenção',
        cronogramas: 'Cronogramas Integrados',
        relatorios: 'Relatórios e Análises',
        documentacao: 'Documentação Técnica'
      };

      if (activeContract?.id) {
        // Get from generated_reports table
        const { data: generatedReports, error: genError } = await supabase
          .from('generated_reports')
          .select('*')
          .eq('contract_id', activeContract.id)
          .order('created_at', { ascending: false });

        if (!genError && generatedReports?.length > 0) {
          // Add source field to identify where it came from
          const reportsWithSource = generatedReports.map(r => ({
            ...r,
            source: 'generated_reports',
            report_type: agentTypeNames[r.agent_type as keyof typeof agentTypeNames] || 'Relatório do Agente IA',
            title: r.title || agentTypeNames[r.agent_type as keyof typeof agentTypeNames] || `Relatório ${r.agent_type || ''}`
          }));
          allReports = [...allReports, ...reportsWithSource];
          console.log('Found in generated_reports:', generatedReports.length);
        }

        // Also get agent documents from contract_documents table
        const { data: agentDocs, error: docError } = await supabase
          .from('contract_documents')
          .select('*')
          .eq('contract_id', activeContract.id)
          .in('category', ['manutencao', 'documentacao', 'cronogramas', 'relatorios', 'maintenance-planner', 'document-generator', 'schedule-generator', 'report-generator'])
          .order('created_at', { ascending: false });

        if (!docError && agentDocs?.length > 0) {
          // Transform contract_documents to report format
          const docsAsReports = agentDocs.map(doc => {
            let parsedContent = {};
            try {
              // Try to parse the description field which contains the document data
              parsedContent = JSON.parse(doc.description || '{}');
            } catch (e) {
              console.log('Could not parse description:', e);
            }

            return {
              id: doc.id,
              title: doc.name || 'Documento sem título',
              report_type: agentTypeNames[doc.category as keyof typeof agentTypeNames] || 'Documento do Contrato',
              description: parsedContent.generated_by ? `Gerado por ${parsedContent.generated_by}` : 'Documento gerado por agente',
              content: parsedContent.generated_content || doc.description || '',
              agent_type: doc.category,
              created_at: doc.created_at,
              source: 'contract_documents',
              metadata: {
                file_type: doc.file_type,
                category: doc.category,
                generated_at: parsedContent.generated_at
              }
            };
          });

          allReports = [...allReports, ...docsAsReports];
          console.log('Found in contract_documents:', agentDocs.length);
        }
      }

      // Alternative search if no reports found
      if (allReports.length === 0 && activeContract?.contract_number && user?.id) {
        // Search by metadata in generated_reports
        const { data: reportsByMetadata } = await supabase
          .from('generated_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const filteredReports = reportsByMetadata?.filter(report =>
          report.metadata?.contract_number === activeContract.contract_number
        ) || [];

        if (filteredReports.length > 0) {
          const reportsWithSource = filteredReports.map(r => ({
            ...r,
            source: 'generated_reports'
          }));
          allReports = [...allReports, ...reportsWithSource];
          console.log('Found by contract_number in metadata:', filteredReports.length);
        }
      }

      console.log('Total reports/documents found:', allReports.length);
      setAvailableReports(allReports);

      if (allReports.length === 0) {
        toast({
          title: "Nenhum relatório disponível",
          description: "Este contrato ainda não tem relatórios gerados pelos agentes.",
          variant: "default"
        });
        setShowAgentReportsDialog(false);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar relatórios.",
        variant: "destructive"
      });
      setShowAgentReportsDialog(false);
    } finally {
      setLoadingReports(false);
    }
  };

  // Function to attach selected reports to context
  const attachSelectedReports = () => {
    if (selectedReports.size === 0) {
      toast({
        title: "Nenhum relatório selecionado",
        description: "Selecione pelo menos um relatório para anexar.",
        variant: "default"
      });
      return;
    }

    const agentTypeNames = {
      'manutencao': 'Plano de Manutenção',
      'cronogramas': 'Cronogramas Integrados',
      'relatorios': 'Relatórios e Análises',
      'documentacao': 'Documentação Técnica'
    };

    const reportsToAttach = availableReports
      .filter(report => selectedReports.has(report.id))
      .map(report => {
        const displayName = agentTypeNames[report.agent_type as keyof typeof agentTypeNames] || report.agent_type || 'Relatório do Agente IA';
        const fileName = `${displayName} - ${formatDateSafe(report.created_at)}.txt`;
        const rawContent = typeof report.content === 'string'
          ? report.content
          : JSON.stringify(report.content ?? {});
        const plainText = rawContent
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        return {
          id: `agent-${report.id}`,
          name: fileName,
          size: plainText.length,
          type: 'text/plain',
          content: plainText || rawContent
        };
      });

    setPersistentAttachments(prev => mergeAttachments(prev, reportsToAttach));

    toast({
      title: "Relatórios adicionados",
      description: `${reportsToAttach.length} relatório(s) foram adicionados ao contexto da conversa.`
    });

    setShowAgentReportsDialog(false);
    setSelectedReports(new Set());
  };

  const mergeAttachments = (base: UploadedFile[], additions: UploadedFile[]) => {
    const map = new Map<string, UploadedFile>();
    base.forEach(file => map.set(file.id, file));
    additions.forEach(file => map.set(file.id, file));
    return Array.from(map.values());
  };
  
  // Detect if content has markdown tables
  const hasMarkdownTable = (text: string): boolean => {
    const tablePattern = /\|[^|\n]*\|[^|\n]*\|/;
    const headerSeparator = /\|[-:\s]+\|/;
    return tablePattern.test(text) && headerSeparator.test(text);
  };

  // Função para limpar texto markdown
  const cleanMarkdownText = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/#{1,6}\s*(.*)/g, '$1')
      .replace(/^\s*[\*\-\+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1')
      .replace(/>\s*(.*)/gm, '$1')
      .replace(/\|.*\|/g, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Ensure session is maintained when contract changes or component mounts
  useEffect(() => {
    if (activeContract?.contract_number) {
      console.log('🔄 Ensuring session for contract:', activeContract.contract_number);
      getOrMaintainSession(selectedAgent, `Assistente Luminus - ${activeContract.contract_number}`);
    }
  }, [activeContract?.contract_number, selectedAgent, getOrMaintainSession]);

  useEffect(() => {
    setExcludedContractDocs(new Set());
  }, [activeContract?.id]);

  useEffect(() => {
    if (!activeContract?.contract_documents) {
      setPersistentAttachments(prev => prev.filter(file => file.id.startsWith('agent-')));
      return;
    }

    const contractFiles = (activeContract.contract_documents as unknown[])
      .filter(doc => doc && doc.file_path)
      .map(doc => ({
        id: `contract-${doc.id}`,
        name: doc.file_name || doc.document_name || doc.name || `Documento-${doc.id}`,
        size: doc.file_size ?? 0,
        type: doc.document_type || doc.file_type || 'application/pdf',
        storage_path: doc.file_path,
        metadata: doc.metadata || null
      }))
      .filter(file => !excludedContractDocs.has(file.id));

    setPersistentAttachments(prev => {
      const agentDocs = prev.filter(file => file.id.startsWith('agent-'));
      const merged = mergeAttachments(contractFiles, agentDocs);
      const unchanged = merged.length === prev.length && merged.every((file, index) => {
        const prevFile = prev[index];
        return (
          prevFile &&
          prevFile.id === file.id &&
          prevFile.storage_path === file.storage_path &&
          prevFile.name === file.name &&
          prevFile.size === file.size &&
          prevFile.type === file.type
        );
      });
      return unchanged ? prev : merged;
    });
  }, [activeContract?.id, activeContract?.contract_documents, excludedContractDocs, excludedContractDocsKey]);

  // Check if there are reports available when contract changes
  useEffect(() => {
    const checkReportsAvailability = async () => {
      if (!activeContract) return;

      try {
        let totalReports = 0;

        // Check in generated_reports table
        if (activeContract?.id) {
          // Try by contract_id
          const { data: generatedReports, error: genError } = await supabase
            .from('generated_reports')
            .select('id')
            .eq('contract_id', activeContract.id);

          if (!genError && generatedReports?.length > 0) {
            totalReports += generatedReports.length;
            console.log('Found generated_reports:', generatedReports.length);
          }

          // Also check in contract_documents for agent-generated documents
          const { data: agentDocs, error: docError } = await supabase
            .from('contract_documents')
            .select('id, category')
            .eq('contract_id', activeContract.id)
            .in('category', ['manutencao', 'documentacao', 'cronogramas', 'relatorios', 'maintenance-planner', 'document-generator', 'schedule-generator', 'report-generator']);

          if (!docError && agentDocs?.length > 0) {
            totalReports += agentDocs.length;
            console.log('Found agent documents in contract_documents:', agentDocs.length);
          }
        }

        // If no reports found yet, try alternative search
        if (totalReports === 0 && activeContract?.contract_number && user?.id) {
          // Search by metadata in generated_reports
          const { data: reportsByMetadata } = await supabase
            .from('generated_reports')
            .select('id, metadata')
            .eq('user_id', user.id);

          const filteredReports = reportsByMetadata?.filter(report =>
            report.metadata?.contract_number === activeContract.contract_number
          ) || [];

          if (filteredReports.length > 0) {
            totalReports += filteredReports.length;
            console.log('Found reports by metadata.contract_number:', filteredReports.length);
          }
        }

        setHasReports(totalReports > 0);
        console.log('Total reports/documents found:', totalReports);
      } catch (error) {
        console.error('Error checking reports availability:', error);
        setHasReports(false);
      }
    };

    checkReportsAvailability();
  }, [activeContract, user]);

  // Enhanced scroll functionality with improved behavior
  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    // Add a small delay to ensure DOM updates are complete
    requestAnimationFrame(() => {
      if (messagesEndRef.current && scrollAreaRef.current) {
        try {
          // First try using the ScrollArea's scroll method
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            // Force layout recalculation before scrolling
            scrollContainer.scrollHeight; // This forces a reflow
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: behavior,
              // Add smooth scroll settings
              block: 'end'
            });
          } else {
            // Fallback to scrollIntoView
            messagesEndRef.current.scrollIntoView({
              behavior: behavior,
              block: 'end',
              inline: 'nearest'
            });
          }
        } catch (error) {
          console.log('Scroll fallback:', error);
          // Final fallback
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView(false);
          }
        }
      }
    });
  };

  const scrollToTop = (behavior: 'smooth' | 'instant' = 'smooth') => {
    if (scrollAreaRef.current) {
      try {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: 0,
            behavior: behavior
          });
        }
      } catch (error) {
        console.log('Scroll to top fallback:', error);
      }
    }
  };

  // Consolidated scroll management to prevent conflicts
  useEffect(() => {
    // Skip if no messages yet
    if (!currentSession?.messages || currentSession.messages.length === 0) return;

    // Use a single timeout and clear any existing ones
    const timeoutId = setTimeout(() => {
      scrollToBottom(isSaving ? 'instant' : 'smooth');
    }, isSaving ? 100 : 200);

    return () => clearTimeout(timeoutId);
  }, [currentSession?.messages, isSaving]);

  // Initial scroll when component mounts (only once)
  useEffect(() => {
    const timeoutId = setTimeout(() => scrollToBottom('instant'), 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Refresh chat history when a new session is forced
  const handleNewConversation = async () => {
    const newSession = await forceNewSession(selectedAgent, `Assistente Luminus - ${activeContract.contract_number}`);
    if (newSession) {
      // Trigger history refresh
      setShowHistory(false);
      setTimeout(() => setShowHistory(true), 100);
    }
  };

  // Agents configuration
  // Simplificado para apenas Conversa Geral
  const agents = [
    {
      id: 'contract-extractor',
      name: 'Conversa Geral',
      description: 'Especialista em extração de dados de documentos contratuais',
      icon: '🤖',
      color: 'bg-blue-500/10 text-blue-700 border-blue-200'
    }
  ];

  const selectedAgentData = agents.find(a => a.id === selectedAgent) || agents[0];

  // File upload handler + helper to upload large PDFs to Storage
  const handleFileUpload = async (files: FileList) => {
    // Check max files limit (5 files)
    if (uploadedFiles.length + files.length > 5) {
      toast({
        title: "Limite de arquivos excedido",
        description: "Você pode anexar no máximo 5 arquivos por vez.",
        variant: "destructive"
      });
      return;
    }

    const newFiles: UploadedFile[] = [];

    // Helper: upload big PDFs to Storage and send only storage_path
    const uploadPdfToStorage = async (file: File): Promise<string> => {
      const path = `chat-uploads/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw upErr;
      return path;
    };
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `file_${Date.now()}_${i}`;
      
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 50MB`,
          variant: "destructive"
        });
        continue;
      }

      try {
        let content = '';
        let storage_path: string | undefined = undefined;
        
        // Handle different file types
        if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
          content = await file.text();
        } else if (file.type.startsWith('image/')) {
          content = await fileToBase64(file);
        } else if (file.type === 'application/pdf') {
          // Evitar payloads enormes nos Edge Functions: se >6MB, usa Storage
          if (file.size > 6 * 1024 * 1024) {
            storage_path = await uploadPdfToStorage(file);
          } else {
            content = await fileToBase64(file);
          }
        } else if (file.type.startsWith('audio/')) {
          content = await fileToBase64(file);
        }

        // Salvar documento na base de conhecimento do contrato se for PDF ou texto
        if (activeContract?.id && (file.type === 'application/pdf' || file.type.startsWith('text/'))) {
          try {
            // Use AuthContext session instead of direct Supabase call
            if (!session?.access_token) {
              console.warn('⚠️ [ModernContractChat] AuthContext session not available, aguardando login...');
              return;
            }

            // Verificar se o usuário é dono do contrato usando AuthContext session
            const { data: contractData, error: contractError } = await supabase
              .from('contracts')
              .select('user_id')
              .eq('id', activeContract.id)
              .single();

            // Se não encontrar o contrato no banco, usar o user_id do contrato ativo se disponível
            const contractUserId = contractData?.user_id || activeContract?.user_id;
            
            if (!contractUserId && (contractError || !contractData)) {
              console.warn('⚠️ Contrato ainda não sincronizado, continuando com dados locais');
              // Não lançar erro, continuar com o processo
            }

            // Use session user data from AuthContext
            const currentUserId = session.user?.id;
            
            // Só verificar permissão se temos o user_id do contrato
            if (contractUserId && currentUserId && contractUserId !== currentUserId) {
              console.warn('⚠️ [ModernContractChat] Usuário não tem permissão para este contrato');
              throw new Error('Sem permissão para anexar documentos neste contrato');
            }
            
            const documentData = {
              contract_id: activeContract.id,
              document_name: file.name,
              document_type: file.type,
              storage_path: storage_path || null,
              file_size: file.size,
              metadata: {
                uploaded_via: 'chat',
                original_name: file.name,
                mime_type: file.type,
                upload_timestamp: new Date().toISOString(),
                content_preview: storage_path ? null : (content ? content.substring(0, 1000) : null)
              },
              uploaded_by: currentUserId
            };

            console.log('Tentando inserir documento:', documentData);
            
            const { data: insertedDoc, error: docError } = await supabase
              .from('contract_documents')
              .insert(documentData)
              .select();
            
            if (docError) {
              console.error('Erro ao salvar documento na knowledge base:', docError);
              toast({
                title: "Erro ao anexar documento",
                description: `Erro: ${docError.message}`,
                variant: "destructive"
              });
            } else {
              console.log(`Documento ${file.name} salvo na knowledge base do contrato:`, insertedDoc);
              toast({
                title: "Documento anexado",
                description: `${file.name} foi salvo na base de conhecimento do contrato`,
              });
            }
          } catch (error) {
            console.error('Erro ao processar documento para knowledge base:', error);
            toast({
              title: "Erro ao anexar documento",
              description: (error && typeof error === 'object' && 'message' in error) ? (error as Error).message : "Erro desconhecido",
              variant: "destructive"
            });
          }
        }

        newFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          ...(storage_path ? { storage_path } : { content })
        });

      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: "Erro no arquivo",
          description: `Erro ao processar ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const base64ToFile = (base64: string, fileName: string, contentType: string): File => {
    const parts = base64.split(',');
    const bstr = atob(parts.length > 1 ? parts[1] : parts[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], fileName, { type: contentType });
    };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        
        const fileList = new DataTransfer();
        fileList.items.add(audioFile);
        
        await handleFileUpload(fileList.files);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
      
      // Audio level visualization (simplified)
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const updateLevel = () => {
        if (isRecording) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255 * 100);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro no áudio",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear all uploaded files
  const clearAllFiles = () => {
    setUploadedFiles([]);
    toast({
      title: "Arquivos removidos",
      description: "Todos os arquivos foram removidos da conversa."
    });
  };

  // Clear only agent-generated documents
  const clearAgentDocuments = () => {
    setUploadedFiles(prev => prev.filter(f => !f.id.startsWith('agent-')));
    setPersistentAttachments(prev => prev.filter(f => !f.id.startsWith('agent-')));
    toast({
      title: "Documentos dos agentes removidos",
      description: "Documentos gerados pelos agentes foram removidos."
    });
  };

  // Clear only user-uploaded files (non-agent files)
  const clearUserFiles = () => {
    setUploadedFiles(prev => prev.filter(f => f.id.startsWith('agent-')));
    setPersistentAttachments(prev => prev.filter(f => f.id.startsWith('agent-') || f.id.startsWith('contract-')));
    toast({
      title: "Arquivos do usuário removidos",
      description: "Arquivos enviados manualmente foram removidos."
    });
  };

  const removePersistentAttachment = (fileId: string) => {
    if (fileId.startsWith('contract-')) {
      setExcludedContractDocs(prev => {
        const next = new Set(prev);
        next.add(fileId);
        return next;
      });
    }
    setPersistentAttachments(prev => prev.filter(f => f.id !== fileId));
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0 && persistentAttachments.length === 0) return;

    // Verificar se contrato está completamente carregado antes de enviar
    if (!activeContract?.id || isSyncing) {
      toast({
        title: "Aguarde a sincronização",
        description: "O contrato ainda está sendo carregado. Por favor, aguarde alguns segundos antes de enviar mensagens.",
        variant: "default"
      });
      return;
    }

    const messageContent = inputMessage;
    const pendingFiles = [...uploadedFiles];
    const baseAttachments = mergeAttachments(persistentAttachments, pendingFiles);

    // Clear input and files immediately after sending
    setInputMessage('');
    setUploadedFiles([]);
    
    // Mostrar indicador de contexto sendo usado
    setIsUsingContext(true);

    // Set AI processing state - this will disable send button
    setIsAiProcessing(true);

    // Add user message to session
    await addMessage({
      role: 'user',
      content: messageContent,
      files: pendingFiles.length > 0 ? pendingFiles : undefined
    });

    try {
      // Prepare files for sending (including context if active)
      const filesToSend = [...baseAttachments];
      
      // Add context file if active
      if (fileContext?.enabled && fileContext.file && !filesToSend.some(file => file.id === 'context_file')) {
        filesToSend.push({
          id: 'context_file',
          name: fileContext.file.name,
          content: fileContext.file.content,
          type: fileContext.file.type,
          size: fileContext.file.size
        });
      }

      // Build comprehensive contract context with full history
      const client = activeContract?.clients || { name: activeContract?.client_name };
      const equipmentInfo = activeContract?.equipment?.[0] || {
        type: activeContract?.equipment_type,
        model: activeContract?.equipment_model,
        location: activeContract?.equipment_location
      };
      const equipmentBrandValue = equipmentInfo?.manufacturer || activeContract?.equipment_brand || '';
      const equipmentSerialValue = equipmentInfo?.serial_number || activeContract?.equipment_serial || '';
      const equipmentPowerValue = (equipmentInfo as unknown)?.power || activeContract?.equipment_power || '';
      const equipmentVoltageValue = (equipmentInfo as unknown)?.voltage || activeContract?.equipment_voltage || '';
      const equipmentConditionValue = (equipmentInfo as unknown)?.condition || activeContract?.equipment_condition || '';
      const equipmentYearValue = (equipmentInfo as unknown)?.year || activeContract?.equipment_year || '';
      const servicesFromRelation = Array.isArray(activeContract?.contract_services) ? activeContract.contract_services : [];
      const fallbackServices = normalizeServices(activeContract?.services).map((service, index) => ({
        id: `fallback-service-${index}`,
        service_name: service
      }));
      const services = servicesFromRelation.length > 0 ? servicesFromRelation : fallbackServices;
      const maintenances = activeContract?.maintenances || [];
      const documents = activeContract?.contract_documents || [];

      // Format maintenances history with details
      const maintenanceHistory = maintenances.map((m: unknown) => ({
        id: m.id,
        scheduled_date: m.scheduled_date,
        scheduled_time: m.scheduled_time,
        technician: m.technician || 'Não atribuído',
        type: m.type,
        status: m.status,
        notes: m.notes || '',
        completed_date: m.completed_date,
        is_overdue: m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
      }));

      // Format documents list
      const documentsList = documents.map((doc: unknown) => ({
        name: doc.document_name,
        type: doc.document_type,
        upload_date: doc.created_at,
        size: doc.file_size
      }));

      // Build contract history text summary
      const contractHistorySummary = `
INFORMAÇÕES DO CONTRATO:
- Número: ${activeContract?.contract_number}
- Tipo: ${activeContract?.contract_type === 'maintenance' ? 'Manutenção' : activeContract?.contract_type === 'rental' ? 'Locação' : 'Híbrido'}
- Status: ${activeContract?.status === 'active' ? 'Ativo' : activeContract?.status === 'suspended' ? 'Suspenso' : 'Cancelado'}
- Vigência: ${activeContract?.start_date ? formatDateSafe(activeContract.start_date) : 'N/A'} até ${activeContract?.end_date ? formatDateSafe(activeContract.end_date) : 'N/A'}
- Valor: R$ ${activeContract?.value ? activeContract.value.toLocaleString('pt-BR') : '0,00'}

CLIENTE:
- Nome: ${client?.name || activeContract?.client_name || 'Não informado'}
- CNPJ: ${client?.cnpj || 'Não informado'}
- Email: ${client?.email || 'Não informado'}
- Telefone: ${client?.phone || 'Não informado'}
- Endereço: ${client?.address || 'Não informado'}

EQUIPAMENTO:
- Tipo: ${equipmentInfo?.type || activeContract?.equipment_type || 'Não informado'}
- Modelo: ${equipmentInfo?.model || activeContract?.equipment_model || 'Não informado'}
- Localização: ${equipmentInfo?.location || activeContract?.equipment_location || 'Não informado'}
- Marca/Fabricante: ${equipmentBrandValue || 'Não informado'}
- Número de série: ${equipmentSerialValue || 'Não informado'}
- Potência: ${equipmentPowerValue || 'Não informado'}
- Tensão: ${equipmentVoltageValue || 'Não informado'}
- Ano: ${equipmentYearValue || 'Não informado'}
- Condição: ${equipmentConditionValue || 'Não informado'}

SERVIÇOS CONTRATADOS:
${services.length > 0 ? services.map((s: unknown) => `- ${s.service_name}: ${s.frequency || 'Conforme necessidade'}`).join('\n') : '- Nenhum serviço cadastrado'}

HISTÓRICO DE MANUTENÇÕES:
- Total de manutenções: ${maintenances.length}
- Agendadas: ${maintenances.filter((m: unknown) => m.status === 'scheduled').length}
- Concluídas: ${maintenances.filter((m: unknown) => m.status === 'completed').length}
- Em atraso: ${maintenances.filter((m: unknown) => m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()).length}
- Canceladas: ${maintenances.filter((m: unknown) => m.status === 'cancelled').length}

ÚLTIMAS MANUTENÇÕES:
${maintenanceHistory.slice(0, 5).map((m: unknown) => `- ${formatDateSafe(m.scheduled_date)} às ${m.scheduled_time} - ${m.type} - Status: ${m.status === 'completed' ? 'Concluída' : m.status === 'scheduled' ? 'Agendada' : 'Cancelada'} - Técnico: ${m.technician}`).join('\n')}

DOCUMENTOS ANEXADOS:
${documentsList.length > 0 ? documentsList.map((d: unknown) => `- ${d.name} (${d.type})`).join('\n') : '- Nenhum documento anexado'}

CONTEÚDO DOS DOCUMENTOS:
${documents.length > 0 ? documents.map((doc: unknown) => {
  const docName = doc.document_name || doc.file_name || 'Documento sem nome';
  const docContent = doc.content_extracted || doc.description || 'Conteúdo não extraído';
  return `--- ${docName} ---\n${docContent}\n`;
}).join('\n') : '- Nenhum conteúdo de documento disponível'}
`;

      const enhancedContext = {
        contract_number: activeContract?.contract_number || '',
        client_name: client?.name || activeContract?.client_name || '',
        contract_history_text: contractHistorySummary,
        contract_data: activeContract ? {
          id: activeContract.id,
          contract_number: activeContract.contract_number,
          contract_type: activeContract.contract_type,
          start_date: activeContract.start_date,
          end_date: activeContract.end_date,
          value: activeContract.value,
          status: activeContract.status,
          description: activeContract.description || '',
          notes: activeContract.notes || '',
          payment_terms: activeContract.payment_terms || '',
          technical_notes: activeContract.technical_notes || '',
          special_conditions: activeContract.special_conditions || '',
          warranty_terms: activeContract.warranty_terms || '',
          extracted_text: activeContract.extracted_text || '',
          renewal_conditions: activeContract.renewal_conditions || '',
          client: {
            id: client?.id || activeContract.client_id,
            name: client?.name || activeContract?.client_name || '',
            cnpj: client?.cnpj || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || '',
            contact_person: client?.contact_person || '',
            notes: client?.notes || ''
          },
          equipment: {
            id: equipmentInfo?.id,
            type: equipmentInfo?.type || activeContract?.equipment_type || 'Não informado',
            model: equipmentInfo?.model || activeContract?.equipment_model || 'Não informado',
            location: equipmentInfo?.location || activeContract?.equipment_location || 'Não informado',
            manufacturer: equipmentBrandValue || null,
            brand: equipmentBrandValue || null,
            serial_number: equipmentSerialValue || null,
            quantity: equipmentInfo?.quantity || 1,
            installation_date: equipmentInfo?.installation_date || null,
            warranty_expiry: equipmentInfo?.warranty_expiry || null,
            power: equipmentPowerValue || null,
            voltage: equipmentVoltageValue || null,
            condition: equipmentConditionValue || null,
            year: equipmentYearValue || null,
            specifications: equipmentInfo?.specifications || {}
          },
          services: services.map((service: any, index: number) => ({
            id: service?.id || `service-${index}`,
            service_name: service?.service_name || service?.name || (typeof service === 'string' ? service : ''),
            description: service?.description || null,
            frequency: service?.frequency,
            duration: service?.duration,
            price: service?.price || null
          })),
          maintenances_detail: maintenanceHistory,
          documents: documentsList,
          documents_content: documents.map((doc: unknown) => ({
            id: doc.id,
            name: doc.document_name || doc.file_name || 'Documento sem nome',
            category: doc.category || doc.document_type,
            description: doc.description,
            extracted_text: doc.content_extracted,
            file_size: doc.file_size,
            created_at: doc.created_at,
            metadata: doc.metadata
          })),
          operational_status: {
            total_maintenances: maintenances.length,
            scheduled_count: maintenances.filter((m: unknown) => m.status === 'scheduled').length,
            overdue_count: maintenances.filter((m: unknown) => 
              m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
            ).length,
            completed_count: maintenances.filter((m: unknown) => m.status === 'completed').length,
            cancelled_count: maintenances.filter((m: unknown) => m.status === 'cancelled').length,
            completion_rate: maintenances.length > 0 ? 
              (maintenances.filter((m: unknown) => m.status === 'completed').length / maintenances.length * 100).toFixed(1) : 0
          },
          financial_summary: {
            total_value: activeContract?.value || 0,
            payment_status: activeContract?.payment_status || 'Em dia',
            last_invoice_date: activeContract?.last_invoice_date || null,
            next_invoice_date: activeContract?.next_invoice_date || null
          }
        } : null,
        conversation_history: currentSession?.messages?.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })) || [],
        system_instructions: 'Você é um assistente especializado em contratos de manutenção e locação. Use TODAS as informações do contrato acima como contexto para responder as perguntas, incluindo o conteúdo completo dos documentos anexados. Seja preciso e baseie suas respostas nos dados disponíveis. Quando solicitado análise de documentos anexados, faça uma análise detalhada e correlacione com as informações do contrato. SEMPRE consulte o conteúdo dos documentos quando disponível para fornecer respostas mais precisas e completas.'
      };
      const hasPdf = filesToSend.some(f => f.type === 'application/pdf' || f.storage_path);
      if (hasPdf) {
        const lower = (messageContent || '').toLowerCase();
        const wantsText = lower.includes('converter para texto') || lower.includes('converter o pdf para texto') || lower.includes('transcrever');
        const wantsFields = lower.includes('extrair campos') || lower.includes('retirar os campos') || lower.includes('campos');
        const pdfFiles = filesToSend.filter(f => f.type === 'application/pdf' || f.storage_path);
        if (wantsText && wantsFields) {
          const sections: string[] = [];
          for (const pdf of pdfFiles) {
            try {
              // 1) Texto extraído
              const source = pdf.storage_path ? pdf.storage_path : base64ToFile(pdf.content as string, pdf.name, pdf.type);
              const textoExtraido = await readAndExtract(source);
              // 2) Campos extraídos
              let fileObj: File;
              if (pdf.storage_path) {
                const res = await readPdfFromStorage(pdf.storage_path, pdf.name);
                fileObj = res.file;
              } else {
                fileObj = base64ToFile(pdf.content as string, pdf.name, pdf.type);
              }
              const extraction = await extractContractFromFile(fileObj);
              const data = extraction?.extractedData || extraction?.data || {};
              const cliente = data.cliente || {};
              const contrato = data.contrato || {};
              const camposTexto = [
                `Cliente: ${cliente.nome || '-'}`,
                `CNPJ: ${cliente.cnpj || '-'}`,
                `Contrato: ${contrato.numero || '-'}`,
                `Tipo: ${contrato.tipo || '-'}`,
                `Início: ${contrato.inicio || '-'}`,
                `Fim: ${contrato.fim || '-'}`,
                `Valor mensal: ${contrato.valor_mensal ?? '-'}`,
                `Valor total: ${contrato.valor_total ?? '-'}`
              ].join('\n- ');
              sections.push(
                `--- ${pdf.name} ---\n` +
                `TEXTO EXTRAÍDO:\n${textoExtraido || '(vazio)'}\n\n` +
                `CAMPOS EXTRAÍDOS:\n- ${camposTexto}`
              );
            } catch (err) {
              console.error('Erro ao extrair PDF:', err);
              sections.push(`--- ${pdf.name} ---\nErro ao processar este PDF.`);
            }
          }
          const respostaTexto = sections.join('\n\n');
          await addMessage({ role: 'assistant', content: respostaTexto });
        } else {
          // Enviar para FastAPI backend smart-chat endpoint com contexto completo do contrato
          const response = await fetch(`${API_BASE_URL}/api/smart-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({
              message: messageContent,
              contractId: activeContract?.id,
              agent_id: selectedAgent,
              uploaded_files: filesToSend,
              contract_context: enhancedContext,
              file_context: fileContext?.enabled ? fileContext.file : null,
              maintain_context: true,
              session_id: currentSession?.id
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const cleanResponse = cleanMarkdownText(data.response || 'Desculpe, não consegui gerar uma resposta.');
          await addMessage({ role: 'assistant', content: cleanResponse });

          // Esconder indicador de contexto sendo usado
          setIsUsingContext(false);
        }
      } else {
        // Aplicar fuzzy search para detectar e corrigir possíveis erros de digitação
        const searchEnhancement = prepareEnhancedSearchQuery(messageContent, enhancedContext.contract_history_text);

        let enhancedMessage = messageContent;
        let fuzzySearchNote = '';

        // Se encontrou sugestões ou correções, adicionar ao contexto
        if (searchEnhancement.suggestions.length > 0 || searchEnhancement.matchedTerms.length > 0) {
          fuzzySearchNote = '\n\n[Sistema de Correção Automática Detectou]:';

          if (searchEnhancement.suggestions.length > 0) {
            fuzzySearchNote += `\n- Possível correção: "${searchEnhancement.suggestions.join('" ou "')}"`;
            // Usar a primeira sugestão automaticamente
            enhancedMessage = searchEnhancement.suggestions[0];
          }

          if (searchEnhancement.matchedTerms.length > 0) {
            fuzzySearchNote += `\n- Termos similares encontrados no contexto: "${searchEnhancement.matchedTerms.join('", "')}"`;
          }

          // Mostrar ao usuário que o sistema detectou e corrigiu
          toast({
            title: "🔍 Correção Automática",
            description: `Detectamos possível erro de digitação. Buscando por: "${searchEnhancement.suggestions[0] || enhancedMessage}"`,
            duration: 3000
          });
        }

        // Enviar para FastAPI backend smart-chat endpoint com contexto completo do contrato
        const response = await fetch(`${API_BASE_URL}/api/smart-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          body: JSON.stringify({
            message: enhancedMessage,
            contractId: activeContract?.id,
            agent_id: selectedAgent,
            uploaded_files: filesToSend,
            contract_context: enhancedContext,
            file_context: fileContext?.enabled ? fileContext.file : null,
            maintain_context: true,
            session_id: currentSession?.id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        const cleanResponse = cleanMarkdownText(data.response || 'Desculpe, não consegui gerar uma resposta.');
        await addMessage({ role: 'assistant', content: cleanResponse });
        
        // Esconder indicador de contexto sendo usado
        setIsUsingContext(false);
      }

    } catch (error) {
      // Restore pending attachments so usuário possa tentar novamente
      if (pendingFiles.length > 0) {
        setUploadedFiles(prev => mergeAttachments(prev, pendingFiles));
      }

      console.error('Erro ao enviar mensagem:', error);

      // Esconder indicador de contexto sendo usado em caso de erro
      setIsUsingContext(false);

      let errorMessage = "Não foi possível enviar a mensagem. Tente novamente.";
      let errorTitle = "Erro na conversa";
      let errorDetails = "";
      let retryMessage = "";

      // Handle specific error types with better feedback
      if (error && typeof error === 'object') {
        const errorObj = error as unknown;

        if (errorObj.message?.includes('Failed to send a request to the Edge Function')) {
          errorTitle = "⏱️ Tempo Limite Excedido";
          errorMessage = "A operação demorou muito para ser processada.";
          errorDetails = "Isso pode acontecer quando: \n• O arquivo é muito grande\n• A pergunta é muito complexa\n• O servidor está sobrecarregado";
          retryMessage = "💡 Tente dividir sua pergunta em partes menores ou enviar arquivos menores.";
        } else if (errorObj.message?.includes('CORS')) {
          errorTitle = "🔌 Erro de Conexão";
          errorMessage = "Não foi possível conectar ao servidor.";
          errorDetails = "Verifique:\n• Sua conexão com a internet\n• Se o navegador está bloqueando a requisição\n• Se há algum firewall ativo";
          retryMessage = "💡 Tente recarregar a página ou desativar extensões do navegador.";
        } else if (errorObj.message?.includes('504') || errorObj.message?.includes('Gateway Timeout')) {
          errorTitle = "⏳ Servidor Ocupado";
          errorMessage = "O servidor está processando muitas requisições.";
          errorDetails = "O sistema está temporariamente sobrecarregado.";
          retryMessage = "💡 Aguarde alguns segundos e tente novamente.";
        } else if (errorObj.message?.includes('context') || errorObj.message?.includes('Context')) {
          errorTitle = "📄 Erro de Contexto";
          errorMessage = "Problema ao carregar o contexto do documento.";
          errorDetails = `Detalhes técnicos: ${errorObj.message}`;
          retryMessage = "💡 Verifique se o documento foi carregado corretamente ou tente selecionar outro contexto.";
        } else if (errorObj.message?.includes('401') || errorObj.message?.includes('Unauthorized')) {
          errorTitle = "🔐 Não Autorizado";
          errorMessage = "Sua sessão expirou ou você não tem permissão.";
          errorDetails = "Você precisa fazer login novamente.";
          retryMessage = "💡 Recarregue a página e faça login novamente.";
        } else if (errorObj.message?.includes('400') || errorObj.message?.includes('Bad Request')) {
          errorTitle = "❌ Dados Inválidos";
          errorMessage = "Os dados enviados estão incorretos.";
          errorDetails = errorObj.message || "Verifique se todos os campos foram preenchidos corretamente.";
          retryMessage = "💡 Revise os dados e tente novamente.";
        } else {
          errorDetails = errorObj.message || "";
        }
      }

      // Show detailed error toast with all information
      toast({
        title: errorTitle,
        description: (
          <div className="space-y-2 mt-2">
            <p className="font-medium">{errorMessage}</p>
            {errorDetails && (
              <p className="text-xs opacity-90 whitespace-pre-wrap">{errorDetails}</p>
            )}
            {retryMessage && (
              <p className="text-xs mt-2 pt-2 border-t">{retryMessage}</p>
            )}
          </div>
        ),
        variant: "destructive",
        duration: 8000 // Show error for longer time
      });
    } finally {
      // Always reset AI processing state
      resetAiProcessingState();
    }
  };

  // Key handler
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isSyncing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do contrato...</p>
        </div>
      </div>
    );
  }

  // Se estiver carregando ou sincronizando, mostrar loading
  if (isSyncing || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  // Se ainda não tem contrato após carregar, mas tem contract prop, usar ele
  if (!activeContract && contract) {
    console.log('⏳ Aguardando sincronização do contrato:', contract);
    // Usar o contrato passado como prop temporariamente
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Sincronizando contrato {contract.contract_number || contract.id}...</p>
          <p className="text-sm text-muted-foreground mt-2">Por favor, aguarde alguns segundos</p>
        </div>
      </div>
    );
  }

  // Só mostrar erro se realmente não tem contrato
  if (!activeContract && !contract) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhum contrato selecionado</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-background via-background to-muted/20 rounded-lg overflow-hidden">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-80 min-w-[20rem] max-w-[20rem] h-full border-r border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 rounded-l-lg overflow-hidden">
          <ModernChatHistory
            contractNumber={activeContract?.id || ''}
            onSelectSession={(sessionId) => {
              resetAiProcessingState(); // Reset AI state when switching sessions
              loadSessionFromDatabase(sessionId);
              setShowHistory(false);
            }}
            currentSessionId={currentSession?.id}
            onNewSession={() => {
              resetAiProcessingState(); // Reset AI state when creating new session
              forceNewSession(selectedAgent, `Nova Conversa - ${activeContract?.contract_number}`);
              setShowHistory(false);
            }}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col rounded-lg overflow-hidden">
        {/* Header */}
        {showHeader && (
          <div className="border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 rounded-t-lg">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Voltar
                  </Button>
                  <div className="h-6 w-px bg-border/60" />
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${selectedAgentData.color}`}>
                      <span className="text-lg">{selectedAgentData.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Chat IA - {activeContract?.contract_number || 'Carregando...'}
                        <Badge variant="secondary" className="text-xs">
                          {selectedAgentData.name}
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {isSyncing ? 'Carregando dados...' : `Cliente: ${activeContract?.client_name || 'Não informado'}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                  {/* Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        setShowHistory(true);
                        toast({
                          title: "Histórico de conversas",
                          description: "Selecione uma conversa para continuar de onde parou."
                        });
                      }}>
                        <Clock className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        resetAiProcessingState(); // Reset AI state when creating new session
                        await forceNewSession(selectedAgent, `Nova Conversa - ${activeContract?.contract_number}`);
                        toast({
                          title: "Nova conversa iniciada",
                          description: "Uma nova sessão de chat foi criada."
                        });
                        if (showHistory) {
                          setShowHistory(false);
                          setTimeout(() => setShowHistory(true), 100);
                        }
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Context Banner */}
        {isSyncing ? (
          <div className="border-b border-border/60 bg-yellow-500/10 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-yellow-600">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Sincronizando dados do contrato...</span>
              </div>
              <Badge variant="outline" className="bg-background/50">
                Aguarde alguns segundos
              </Badge>
            </div>
          </div>
        ) : (
          <div className="border-b border-border/60 bg-primary/5 px-6 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-primary shrink-0">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Contexto ativo:</span>
              </div>
              <Badge variant="outline" className="bg-background/50 max-w-[200px] overflow-hidden" title={`${activeContract?.contract_number} - ${activeContract?.client_name}`}>
                <span className="truncate block">{activeContract?.contract_number} - {activeContract?.client_name}</span>
              </Badge>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {activeContract?.contract_type === 'maintenance' ? 'Manutenção' :
                   activeContract?.contract_type === 'rental' ? 'Locação' : 'Híbrido'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {activeContract?.equipment_location || 'Local não informado'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative flex-1 min-h-0">
          <ScrollArea ref={scrollAreaRef} className="h-full p-6">
            <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Indicador de contexto sendo usado */}
            {isUsingContext && (
              <div className="flex items-center justify-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700 font-medium">
                    IA consultando documentos do contrato...
                  </span>
                </div>
              </div>
            )}
            
            {currentSession?.messages?.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-10 h-10 shrink-0 ring-2 ring-primary/20 shadow-lg">
                    <AvatarFallback className={`${selectedAgentData.color} bg-gradient-to-br from-primary/20 to-primary/10`}>
                      <Brain className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`relative max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-16'
                      : 'bg-card border border-border/60 text-card-foreground'
                  }`}
                >
                   {message.role === 'assistant' ? (
                     <FormattedMessage content={message.content} />
                   ) : (
                     <div className="text-sm leading-relaxed whitespace-pre-wrap">
                       {message.content}
                     </div>
                   )}
                  
                  {message.files && message.files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/40">
                          {getFileIcon(file.type)}
                          <span className="text-xs font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/20">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground/70">
                      {formatDateSafe(message.timestamp)} às {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <Avatar className="w-10 h-10 shrink-0 ring-2 ring-primary/30 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isAiProcessing && (
              <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Avatar className="w-10 h-10 shrink-0 ring-2 ring-primary/20 shadow-lg animate-pulse">
                  <AvatarFallback className={`${selectedAgentData.color} bg-gradient-to-br from-primary/20 to-primary/10`}>
                    <Brain className="h-5 w-5 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="bg-card border border-border/60 text-card-foreground rounded-2xl px-4 py-3 shadow-sm max-w-[75%]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      IA analisando sua solicitação...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Scroll Navigation Buttons */}
          <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => scrollToTop('smooth')}
                    className="w-10 h-10 p-0 shadow-lg bg-background/90 backdrop-blur-sm border hover:bg-background"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Ir para o início</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => scrollToBottom('smooth')}
                    className="w-10 h-10 p-0 shadow-lg bg-background/90 backdrop-blur-sm border hover:bg-background"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Ir para o final</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Input Area */}
        <div 
          className={`border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 p-6 rounded-b-lg ${
            dragActive ? 'border-primary border-2 bg-primary/5' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {/* Persistent attachments (context) */}
        {persistentAttachments.length > 0 && (
          <div className="mb-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documentos no contexto</span>
            <div className="flex flex-wrap gap-2">
            {persistentAttachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border"
              >
                {getFileIcon(file.type)}
                <span className="text-xs font-medium truncate max-w-32">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePersistentAttachment(file.id)}
                  className="h-6 w-6 p-0 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Anexos pendentes</span>
            <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border"
              >
                {getFileIcon(file.type)}
                <span className="text-xs font-medium truncate max-w-32">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-6 w-6 p-0 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            </div>
          </div>
        )}

          {/* Main Input */}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem ou arraste arquivos aqui..."
                className="min-h-12 max-h-32 resize-none pr-12 bg-background/50 border-border/60"
                disabled={isSaving || isAiProcessing}
              />
              
              {/* Attachment Controls */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4 mr-2" />
                      Anexar arquivo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openAgentReportsDialog}
                      disabled={hasReports === false}
                      className={hasReports === false ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      <FileStack className="h-4 w-4 mr-2" />
                      <span>
                        Anexar relatórios dos agentes
                        {hasReports === false && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Nenhum disponível)
                          </span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>

            <Button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isSaving || isAiProcessing || isSyncing}
              className="h-12 px-6"
              title={isSyncing ? "Aguardando sincronização do contrato..." : ""}
            >
              {isSaving || isAiProcessing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isSyncing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.ogg"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />

          {/* Drag & Drop Overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Paperclip className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-primary">Solte os arquivos aqui</p>
                <p className="text-xs text-muted-foreground">PDF, imagens, áudio e texto</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Reports Selection Dialog */}
      <Dialog open={showAgentReportsDialog} onOpenChange={setShowAgentReportsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-primary" />
              Selecionar Relatórios dos Agentes
            </DialogTitle>
            <DialogDescription>
              Selecione os relatórios que deseja incluir no contexto da conversa.
              {availableReports.length === 0 && ' Nenhum relatório disponível no momento.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {availableReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum relatório foi gerado ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os relatórios serão listados aqui após serem gerados pelos agentes.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {availableReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={report.id}
                        checked={selectedReports.has(report.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedReports);
                          if (checked) {
                            newSelected.add(report.id);
                          } else {
                            newSelected.delete(report.id);
                          }
                          setSelectedReports(newSelected);
                        }}
                      />
                      <label
                        htmlFor={report.id}
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {report.report_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateSafe(report.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {report.title || 'Relatório sem título'}
                        </p>
                        {report.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {report.summary}
                          </p>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAgentReportsDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={attachSelectedReports}
              disabled={selectedReports.size === 0}
            >
              <FileStack className="h-4 w-4 mr-2" />
              Anexar {selectedReports.size} relatório{selectedReports.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
