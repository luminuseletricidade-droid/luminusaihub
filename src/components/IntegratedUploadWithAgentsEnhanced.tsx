import React, { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL, getApiUrl, getTimeoutForFileSize, handleApiError, TimeoutError } from '@/config/api.config';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import {
  validateCNPJ,
  formatCNPJ,
  formatCNPJWhileTyping,
  getCNPJErrorMessage,
  validateCNPJWithDetails
} from '@/utils/cnpjValidation';
import { useAgentDocuments } from '@/hooks/useAgentDocuments';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressFormWithCep } from '@/components/AddressFormWithCep';

// Enhanced date validation utility
const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString || dateString === '' || dateString.toLowerCase() === 'invalid date') {
    return false;
  }
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

const formatDateSafely = (dateString: string | null | undefined): string => {
  if (!isValidDate(dateString)) {
    return 'Data não informada';
  }
  try {
    const normalized = parseAndCleanDate(dateString || '');
    if (!normalized) return 'Data não informada';
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return 'Data não informada';
  }
};

// Importar funções de data do arquivo utilitário
import { parseDate, getCurrentDate, addYears, addMonths, formatDateToISO, toLocalDate } from '@/lib/dateUtils';
import { findOrCreateClient } from '@/lib/clientUtils';

const parseAndCleanDate = parseDate;
import { 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Settings, 
  Clock, 
  BarChart3,
  AlertCircle,
  Building2,
  FolderOpen,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Hash,
  Wrench,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Check,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ContractEditor from '@/components/ContractEditor';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/utils/toastManager';
import { useAuth } from '@/contexts/AuthContext';
import { generateMaintenances } from '@/utils/generateMaintenances';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface IntegratedUploadWithAgentsEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contract: unknown) => void;
}

interface ExtractedData {
  // Informações do Contrato
  contract_number: string;
  contract_value: number;
  monthly_value?: number;
  duration_months?: number;
  start_date: string;
  end_date: string;
  contract_type: string;
  
  // Informações do Cliente - COMPLETAS
  client_name: string;
  client_legal_name?: string;
  client_cnpj: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_neighborhood?: string;
  client_number?: string;
  client_contact_person?: string;
  client_city?: string;
  client_state?: string;
  client_zip_code?: string;
  client_needs_review?: boolean;
  
  // Informações do Equipamento - COMPLETAS
  equipment_type?: string;
  equipment_model?: string;
  equipment_serial?: string;
  equipment_location?: string;
  equipment_power?: string;
  equipment_voltage?: string;
  equipment_brand?: string;
  equipment_year?: string;
  equipment_condition?: string;
  
  // Serviços e Observações
  services: string[];
  observations?: string;
  payment_terms?: string;
  technical_notes?: string;
  special_conditions?: string;
  warranty_terms?: string;
}

interface ExistingClient {
  id: string;
  name: string;
  cnpj: string;
  contracts_count?: number;
}

const IntegratedUploadWithAgentsEnhanced: React.FC<IntegratedUploadWithAgentsEnhancedProps> = ({
  isOpen,
  onClose,
  onContractCreated
}) => {
  const { user } = useAuth();

  // Helper function to safely convert any value to string
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    if ('name' in value && typeof value.name === 'string') return value.name;
    if ('value' in value && typeof value.value === 'string') return value.value;
    if ('label' in value && typeof value.label === 'string') return value.label;
    console.warn('⚠️ Converting object to string:', value);
    return JSON.stringify(value);
  }
  return String(value);
};

const servicesToArray = (services: unknown): string[] => {
  if (!services) return [];
  if (Array.isArray(services)) {
    return services
      .map(service =>
        typeof service === 'string'
          ? service
          : service?.type || service?.description || service?.name || ''
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
    return [safeString(services)].filter(Boolean);
  }
  return [];
};

const servicesToText = (services: unknown): string => servicesToArray(services).join('\n');

const sanitizeServicesInData = <T extends { services?: any }>(data: T | null): T | null => {
  if (!data) return data;
  return {
    ...data,
    services: servicesToArray(data.services)
  };
};

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // Estado para travar a tela durante processamento

  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [backgroundJobs, setBackgroundJobs] = useState<Map<string, {jobId: string, status: string, filename: string}>>(new Map());
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<Map<string, unknown>>(new Map());
  const [isEditingData, setIsEditingData] = useState(false);
  const [apiExtractedText, setApiExtractedText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [servicesInput, setServicesInput] = useState('');
  const servicesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hasSavedContract, setHasSavedContract] = useState(false);

  const updateEditedField = <K extends keyof ExtractedData>(
    field: K,
    value: ExtractedData[K]
  ) => {
    setEditedData((prev) => {
      if (!prev) return prev;
      if (prev[field] === value) return prev;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const getNumericInputValue = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : '';

  const normalizeNumericInput = (rawValue: string, previous?: number, options?: { allowEmpty?: boolean }) => {
    const trimmed = rawValue.trim().replace(',', '.');
    if (trimmed.length === 0) {
      return options?.allowEmpty ? undefined : previous ?? 0;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return options?.allowEmpty ? previous ?? undefined : previous ?? 0;
    }

    return parsed;
  };

  const normalizeMandatoryNumber = (rawValue: string, previous?: number) =>
    normalizeNumericInput(rawValue, previous, { allowEmpty: false }) ?? previous ?? 0;

  const normalizeOptionalNumber = (rawValue: string, previous?: number) =>
    normalizeNumericInput(rawValue, previous, { allowEmpty: true });

  const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  // Limpar o campo de novo serviço apenas ao entrar no modo de edição
  useEffect(() => {
    if (isEditingData) {
      setServicesInput('');
    }
  }, [isEditingData]);

  // Só auto-resize quando existir textarea; evitar blur/reset do input
  useEffect(() => {
    if (isEditingData && servicesTextareaRef.current) {
    autoResizeTextarea(servicesTextareaRef.current);
    }
  }, [isEditingData]);

  // SSE state for real-time progress
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Network connectivity state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastConnectivityCheck, setLastConnectivityCheck] = useState<number | null>(null);

  // Network connectivity monitoring
  const checkNetworkConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to reach our API with a lightweight endpoint
      const response = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      setLastConnectivityCheck(Date.now());
      return response.ok;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  }, []);

  // Estado para validação de CNPJ
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  // SSE connection cleanup
  const cleanupSSEConnection = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setCurrentSessionId(null);
  }, [eventSource]);

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "🌐 Conectado",
        description: "Conexão com a internet restaurada",
        variant: "default"
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      cleanupSSEConnection(); // Close SSE connections when offline
      toast({
        title: "📵 Desconectado",
        description: "Conexão com a internet perdida. O sistema aguardará a reconexão.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [ cleanupSSEConnection]);

  // Initialize SSE connection for real-time progress with fallback mechanism
  const initializeSSEProgress = useCallback(async (sessionId: string) => {
    try {
      // Close any existing connection
      cleanupSSEConnection();

      // Start upload session on backend with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          response = await fetch(getApiUrl('/api/start-upload-session'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              filename: selectedFile?.name || 'unknown'
            }),
            // Add network interruption resilience
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) break;

          // Increment retry count for non-ok responses
          retryCount++;
          console.warn(`Upload session initialization failed with status ${response.status}, attempt ${retryCount}/${maxRetries}`);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to initialize upload session after ${maxRetries} attempts (status: ${response.status})`);
          }

          // Exponential backoff before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));

        } catch (fetchError) {
          retryCount++;
          console.warn(`SSE initialization attempt ${retryCount} failed:`, fetchError);

          if (retryCount >= maxRetries) {
            throw fetchError;
          }
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000));
        }
      }

      // Create SSE connection with retry and fallback logic
      const source = new EventSource(getApiUrl(`/api/progress-stream/${sessionId}`));
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      let reconnectTimer: NodeJS.Timeout | null = null;

      const attemptReconnection = () => {
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('Max SSE reconnection attempts reached, falling back to polling');
          cleanupSSEConnection();
          // Could implement polling fallback here
          return;
        }

        reconnectAttempts++;
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10s backoff

        console.log(`Attempting SSE reconnection #${reconnectAttempts} in ${backoffTime}ms`);

        reconnectTimer = setTimeout(() => {
          try {
            // Don't reinitialize the whole upload session, just recreate the SSE connection
            const newSource = new EventSource(getApiUrl(`/api/progress-stream/${sessionId}`));
            // Copy the event handlers to the new source
            newSource.onopen = source.onopen;
            newSource.onmessage = source.onmessage;
            newSource.onerror = source.onerror;
            // Close old connection before creating new one
            cleanupSSEConnection();
          } catch (error) {
            console.error('SSE reconnection failed:', error);
            // Don't attempt reconnection again to avoid infinite loop
          }
        }, backoffTime);
      };

      source.onopen = () => {
        console.log('SSE connection opened');
        reconnectAttempts = 0; // Reset retry count on successful connection
      };

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Update progress based on SSE data
          if (data.progress !== undefined) {
            setExtractionProgress(data.progress);
          }

          if (data.status) {
            setProcessingStatus(data.status);
          }

          if (data.message) {
            setProcessingStatus(data.message);
          }

          // Handle completion
          if (data.status === 'completed' && data.result) {
            setExtractedData(data.result);
            cleanupSSEConnection();
          }

          // Reset reconnection attempts on successful message
          reconnectAttempts = 0;

        } catch (parseError) {
          console.warn('Failed to parse SSE data:', parseError);
        }
      };

      source.onerror = (error) => {
        console.warn('SSE connection warning - this is normal if the connection closes:', error);

        // Don't treat initial connection errors as fatal
        // SSE connections can fail initially but the upload process continues
        if (source.readyState === EventSource.CONNECTING) {
          // Still trying to connect, let it continue
          return;
        }

        // Only attempt reconnection if we haven't exceeded the limit
        if (source.readyState === EventSource.CLOSED && reconnectAttempts < maxReconnectAttempts) {
          console.log(`SSE reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
          attemptReconnection();
        } else {
          // Don't cleanup immediately - the upload might still succeed
          console.log('SSE connection closed after max attempts - continuing without real-time updates');
          setEventSource(null);
        }
      };

      setEventSource(source);
      setCurrentSessionId(sessionId);

      return sessionId;
    } catch (error) {
      console.error('Failed to initialize SSE:', error);
      throw error;
    }
  }, [selectedFile, cleanupSSEConnection]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupSSEConnection();
    };
  }, [cleanupSSEConnection]);

  // Resilient fetch with automatic retry for network interruptions
  const resilientFetch = useCallback(async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // If response is ok or it's a client error (4xx), don't retry
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error (5xx) - retry with exponential backoff
        if (attempt < maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
          console.warn(`Server error ${response.status}, retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        console.warn(`Network request attempt ${attempt}/${maxRetries} failed:`, error);

        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }

        // For network errors, use exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        console.log(`Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }, []);

  // Estados para controle de cliente existente
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientChoice, setClientChoice] = useState<'existing' | 'new' | null>(null);

  const agents = {
    'manutencao': {
      name: 'Plano de Manutenção e Cronograma',
      icon: <Settings className="w-5 h-5" />,
      description: 'Analisa PDFs e gera planos de manutenção com dados reais extraídos do documento',
      color: 'bg-blue-500'
    },
    'documentacao': {
      name: 'Documentação Técnica e EAP',
      icon: <FileText className="w-5 h-5" />,
      description: 'Extrai dados do PDF para criar memorial descritivo e especificações técnicas',
      color: 'bg-green-500'
    },
    'cronogramas': {
      name: 'Cronogramas Integrados',
      icon: <Clock className="w-5 h-5" />,
      description: 'Processa PDF para gerar cronogramas físico/financeiro, compras e desembolso',
      color: 'bg-purple-500'
    },
    'relatorios': {
      name: 'Relatórios e Análises',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Analisa conteúdo do PDF para produzir relatórios de progresso detalhados',
      color: 'bg-orange-500'
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação do tipo de arquivo
    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive"
      });
      return;
    }

    // Validação do tamanho do arquivo
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > 10) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo tem ${fileSizeMB.toFixed(1)}MB. Processamento assíncrono será usado para evitar timeout.`,
        variant: "default"
      });
    } else if (fileSizeMB > 5) {
      toast({
        title: "Arquivo grande detectado",
        description: `O arquivo tem ${fileSizeMB.toFixed(1)}MB. Arquivos grandes podem demorar mais para processar.`,
        variant: "default"
      });
    }

    setSelectedFile(file);
    setExtractedData(null);
    setGeneratedDocuments(new Map());
    setExistingClient(null);
    setClientChoice(null);
  }, []);

  // Handler para cancelar e limpar TODA a sessão
  const handleCancel = useCallback(() => {
    console.log('🚫 Cancelando e limpando sessão completa...');

    // 1. Limpar conexões SSE
    cleanupSSEConnection();

    // 2. Resetar TODOS os estados para valores iniciais
    setSelectedFile(null);
    setSelectedAgents(new Set());
    setIsProcessing(false);
    setIsLocked(false);
    setUploadProgress(0);
    setExtractionProgress(0);
    setProcessingStatus('');
    setEstimatedTime(null);
    setProcessingStartTime(null);
    setBackgroundJobs(new Map());
    setRetryCount(0);
    setExtractedData(null);
    setGeneratedDocuments(new Map());
    setIsEditingData(false);
    setApiExtractedText('');
    setUploadedFileName('');
    setUploadedFileSize(0);
    setEditedData(null);
    setCurrentSessionId(null);
    setCnpjError(null);
    setExistingClient(null);
    setClientChoice(null);
    setHasSavedContract(false);

    console.log('✅ Sessão limpa completamente');

    // 3. Fechar modal
    onClose();
  }, [cleanupSSEConnection, onClose]);

  // Polling function for background job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 60; // Poll for up to 10 minutes (every 10s)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/job-status/${jobId}`));
        const result = await response.json();

        if (result.status === 'completed') {
          // Job completed successfully
          setBackgroundJobs(prev => {
            const newJobs = new Map(prev);
            newJobs.set(jobId, { ...newJobs.get(jobId)!, status: 'completed' });
            return newJobs;
          });

          toast({
            title: "✅ Processamento concluído",
            description: `Arquivo "${result.filename || 'documento'}" processado com sucesso!`,
            variant: "default"
          });

          return;
        } else if (result.status === 'failed') {
          // Job failed
          setBackgroundJobs(prev => {
            const newJobs = new Map(prev);
            newJobs.set(jobId, { ...newJobs.get(jobId)!, status: 'failed' });
            return newJobs;
          });

          toast({
            title: "❌ Processamento falhou",
            description: result.error || "Erro no processamento em segundo plano",
            variant: "destructive"
          });

          return;
        } else if (result.status === 'processing' && attempts < maxAttempts) {
          // Still processing, continue polling
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else if (attempts >= maxAttempts) {
          // Timeout
          toast({
            title: "⚠️ Timeout no processamento",
            description: "O processamento está demorando mais que o esperado",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000);
        }
      }
    };

    setTimeout(poll, 5000); // Start polling after 5 seconds
  }, []);

  // Main processing function - moved here to avoid initialization error

  // Retry mechanism for failed extractions
  const retryExtraction = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
      setProcessingStatus(`🔄 Tentativa ${retryCount + 1}/${maxRetries}...`);

      toast({
        title: "🔄 Tentando novamente",
        description: `Tentativa ${retryCount + 1} de ${maxRetries}`,
        variant: "default"
      });
    }

    // Call the main processing function
    return handleProcessFile();
  }, [retryCount, maxRetries]);

  // Check if retry should be attempted
  const shouldRetry = useCallback((error: string): boolean => {
    if (retryCount >= maxRetries) return false;

    // Retry conditions
    const retryableErrors = [
      'timeout',
      'network error',
      'connection failed',
      'server unavailable',
      'temporary error',
      'processing failed',
      'extraction timeout'
    ];

    return retryableErrors.some(retryableError =>
      error.toLowerCase().includes(retryableError)
    );
  }, [retryCount, maxRetries]);

  // Fallback extraction methods when primary extraction fails
  const tryFallbackExtraction = useCallback(async (fileUrl: string, filename: string): Promise<unknown> => {
    const fallbackMethods = [
      { method: 'pdfplumber', description: 'Usando PDFPlumber como alternativa' },
      { method: 'pymupdf', description: 'Tentando com PyMuPDF' },
      { method: 'ocr', description: 'Aplicando OCR avançado' },
      { method: 'manual', description: 'Extração manual assistida' }
    ];

    for (let i = 0; i < fallbackMethods.length; i++) {
      const fallback = fallbackMethods[i];

      try {
        setProcessingStatus(`🔧 ${fallback.description}...`);

        toast({
          title: "🔧 Método Alternativo",
          description: fallback.description,
          variant: "default"
        });

        const response = await fetch(getApiUrl('/api/process-pdf-fallback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl,
            filename,
            method: fallback.method,
            fallbackAttempt: i + 1
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            toast({
              title: "✅ Sucesso com método alternativo",
              description: `${fallback.description} foi bem-sucedido!`,
              variant: "default"
            });
            return result;
          }
        }
      } catch (error) {
        console.warn(`Fallback method ${fallback.method} failed:`, error);
        continue;
      }
    }

    // All fallback methods failed
    throw new Error('Todos os métodos de extração falharam');
  }, []);

  // Enhanced error logging for debugging
  const logDetailedError = useCallback((error: any, context: string, additionalData?: unknown) => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        name: error?.name,
      },
      file: {
        name: selectedFile?.name,
        size: selectedFile?.size,
        type: selectedFile?.type,
        lastModified: selectedFile?.lastModified,
      },
      session: {
        retryCount,
        processingStartTime,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      additionalData,
    };

    // Log to console with structured format
    console.group(`🚨 Error in ${context}`);
    console.error('Error Details:', errorInfo.error);
    console.info('File Info:', errorInfo.file);
    console.info('Session Info:', errorInfo.session);
    if (additionalData) {
      console.info('Additional Data:', additionalData);
    }
    console.groupEnd();

    // Send to backend for centralized logging (optional)
    if (import.meta.env.PROD) {
      fetch(getApiUrl('/api/log-error'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      }).catch(logError => {
        console.warn('Failed to send error log to server:', logError);
      });
    }

    return errorInfo;
  }, [selectedFile, retryCount, processingStartTime]);

  // Create user-friendly error messages for different failure scenarios
  const getUserFriendlyErrorMessage = useCallback((error: string, statusCode?: number) => {
    const errorLower = error.toLowerCase();

    // Network and connection errors
    if (errorLower.includes('network') || errorLower.includes('connection') || statusCode === 0) {
      return {
        title: "🌐 Problema de Conexão",
        description: "Verifique sua conexão com a internet e tente novamente. Se o problema persistir, pode ser um problema temporário do servidor.",
        variant: "destructive" as const,
        action: "Tentar novamente em alguns minutos"
      };
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return {
        title: "🔧 Erro do Servidor",
        description: "Nossos servidores estão enfrentando dificuldades temporárias. Nossa equipe foi notificada automaticamente.",
        variant: "destructive" as const,
        action: "Aguarde alguns minutos e tente novamente"
      };
    }

    // Authentication errors
    if (statusCode === 401 || errorLower.includes('unauthorized')) {
      return {
        title: "🔐 Acesso Negado",
        description: "Sua sessão expirou ou você não tem permissão para esta operação. Faça login novamente.",
        variant: "destructive" as const,
        action: "Fazer login novamente"
      };
    }

    // File format errors
    if (errorLower.includes('formato') || errorLower.includes('format') || errorLower.includes('invalid file')) {
      return {
        title: "📄 Formato Inválido",
        description: "O arquivo não está em um formato suportado. Certifique-se de usar arquivos PDF válidos.",
        variant: "destructive" as const,
        action: "Converter arquivo para PDF válido"
      };
    }

    // File size errors
    if (errorLower.includes('size') || errorLower.includes('large') || errorLower.includes('tamanho')) {
      return {
        title: "📁 Arquivo Muito Grande",
        description: "O arquivo excede o tamanho máximo permitido. Tente comprimir o PDF ou dividir em partes menores.",
        variant: "destructive" as const,
        action: "Reduzir tamanho do arquivo"
      };
    }

    // Processing timeout
    if (errorLower.includes('timeout') || errorLower.includes('tempo limite')) {
      return {
        title: "⏱️ Tempo Limite Excedido",
        description: "O processamento demorou mais que o esperado. Isso pode acontecer com arquivos muito complexos.",
        variant: "default" as const,
        action: "Tentar com arquivo menor ou aguardar"
      };
    }

    // OCR and text extraction
    if (errorLower.includes('ocr') || errorLower.includes('texto') || errorLower.includes('extraction')) {
      return {
        title: "🔍 Problema na Extração de Texto",
        description: "Dificuldade para extrair texto do PDF. Pode ser um documento escaneado ou com proteção.",
        variant: "default" as const,
        action: "Usar PDF com texto selecionável"
      };
    }

    // CNPJ/validation errors
    if (errorLower.includes('cnpj') || errorLower.includes('validation')) {
      return {
        title: "📋 Dados Incompletos",
        description: "Algumas informações obrigatórias não foram encontradas no documento. O sistema tentará processar mesmo assim.",
        variant: "default" as const,
        action: "Verificar se o documento contém todas as informações"
      };
    }

    // Generic error
    return {
      title: "⚠️ Erro no Processamento",
      description: "Ocorreu um erro inesperado durante o processamento. Nossa equipe foi notificada para investigar.",
      variant: "destructive" as const,
      action: "Tentar novamente ou contatar suporte"
    };
  }, []);

  // Gerar número único de contrato
  const generateUniqueContractNumber = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CONT-${year}${month}${day}-${timestamp}-${random}`;
  }, []);

  // Função para verificar e gerar número de contrato único
  const ensureUniqueContractNumber = useCallback(async (originalNumber: string): Promise<string> => {
    // Se não veio número da IA, gerar um novo
    if (!originalNumber || originalNumber.trim() === '') {
      return generateUniqueContractNumber();
    }

    let attempts = 0;
    let candidateNumber = originalNumber.trim();
    
    while (attempts < 10) { // Máximo 10 tentativas para evitar loop infinito
      try {
        console.log(`🔍 Verificando se número ${candidateNumber} existe...`);
        
        const { data: existingContract, error } = await supabase
          .from('contracts')
          .select('id')
          .eq('contract_number', candidateNumber)
          .maybeSingle(); // Checar globalmente por conta da constraint única

        if (error) {
          console.log('⚠️ Erro ao verificar número único:', error);
          return generateUniqueContractNumber();
        }

        if (!existingContract) {
          console.log(`✅ Número ${candidateNumber} está disponível`);
          return candidateNumber;
        }

        // Se chegou aqui, o número já existe - gerar um novo
        candidateNumber = generateUniqueContractNumber();
        console.log(`⚠️ Número ${originalNumber} já existe. Tentativa ${attempts + 1}: ${candidateNumber}`);
        attempts++;
      } catch (error) {
        console.error('❌ Erro na verificação de número único:', error);
        return generateUniqueContractNumber();
      }
    }
    
    // Se esgotar tentativas, usar timestamp como fallback
    const fallbackNumber = `CONT-${Date.now()}`;
    console.log(`🔄 Usando número fallback: ${fallbackNumber}`);
    return fallbackNumber;
  }, [ generateUniqueContractNumber]);

  const simulateExtraction = async () => {
    // Simular progresso de extração detalhado
    const steps = [
      { progress: 10, status: 'Abrindo documento PDF...' },
      { progress: 20, status: 'Lendo estrutura do PDF...' },
      { progress: 30, status: 'Identificando dados do contrato...' },
      { progress: 40, status: 'Extraindo informações completas do cliente...' },
      { progress: 50, status: 'Buscando CNPJ, email e telefone...' },
      { progress: 60, status: 'Extraindo endereço completo...' },
      { progress: 70, status: 'Analisando equipamentos e especificações técnicas...' },
      { progress: 80, status: 'Identificando serviços e condições especiais...' },
      { progress: 90, status: 'Coletando observações e notas técnicas...' },
      { progress: 100, status: 'Processamento concluído!' }
    ];

    for (const step of steps) {
      setExtractionProgress(step.progress);
      setProcessingStatus(step.status);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  };

  const checkExistingClient = async (clientName: string, clientCnpj: string) => {
    if (!user) return null;

    // Skip search if client name is the default placeholder
    if (clientName === 'Nao especificado' || clientName === 'Cliente Sem Nome') {
      console.log(`⚠️ Pulando busca de cliente - nome padrão detectado: "${clientName}"`);
      return null;
    }

    console.log(`🔍 Buscando cliente: Nome="${clientName}", CNPJ="${clientCnpj}", User ID="${user.id}"`);

    // Buscar por CNPJ primeiro (mais preciso)
    if (clientCnpj) {
      // Limpar CNPJ removendo caracteres não numéricos para comparação
      const cleanCnpj = clientCnpj.replace(/[^\d]/g, '');
      
      // Build OR query condition, avoiding duplicates
      let cnpjConditions: string;
      if (cleanCnpj === clientCnpj) {
        // If they're the same, only search for one
        cnpjConditions = `cnpj.eq.${cleanCnpj}`;
      } else {
        // If different, search for both
        cnpjConditions = `cnpj.eq.${cleanCnpj},cnpj.eq.${clientCnpj}`;
      }
      
      const { data: clientByCnpj, error: cnpjError } = await supabase
        .from('clients')
        .select('id, name, cnpj')
        .or(cnpjConditions)  // Buscar tanto limpo quanto formatado, evitando duplicatas
        .eq('user_id', user?.id)
        .maybeSingle();

      console.log(`📊 Busca por CNPJ retornou:`, clientByCnpj, cnpjError ? `Erro: ${cnpjError.message}` : '');

      if (clientByCnpj) {
        // Contar contratos existentes
        const { count } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientByCnpj.id);

        return { ...clientByCnpj, contracts_count: count || 0 };
      }
    }

    // Se não encontrou por CNPJ, buscar por nome
    const cleanClientName = clientName.trim().replace(/[%_]/g, '\\$&'); // Escape special LIKE characters
    const { data: clientByName, error: nameError } = await supabase
      .from('clients')
      .select('id, name, cnpj')
      .ilike('name', cleanClientName)  // Usar ilike para busca case-insensitive
      .eq('user_id', user?.id)
      .maybeSingle();

    console.log(`📊 Busca por nome retornou:`, clientByName, nameError ? `Erro: ${nameError.message}` : '');

    if (clientByName) {
      const { count } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientByName.id);

      return { ...clientByName, contracts_count: count || 0 };
    }

    console.log(`❌ Nenhum cliente encontrado`);
    return null;
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive"
      });
      return;
    }

    // Check network connectivity before starting upload
    if (!isOnline) {
      toast({
        title: "📵 Sem Conexão",
        description: "Você está offline. Conecte-se à internet para processar arquivos.",
        variant: "destructive"
      });
      return;
    }

    // Perform deep connectivity check
    const hasConnectivity = await checkNetworkConnectivity();
    if (!hasConnectivity) {
      toast({
        title: "🌐 Conectividade Instável",
        description: "Não foi possível alcançar nossos servidores. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsLocked(true); // Travar interface durante processamento
    setUploadProgress(0);
    setExtractionProgress(0);
    setProcessingStatus('Iniciando processamento...');

    // Calcular tempo estimado baseado no tamanho do arquivo
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    const baseTimeSeconds = Math.max(10, fileSizeMB * 2); // 2 segundos por MB, mínimo 10s
    setEstimatedTime(baseTimeSeconds);
    setProcessingStartTime(Date.now());
    
    // Auto-scroll suave para área de processamento
    setTimeout(() => {
      const processingSection = document.getElementById('processing-section');
      if (processingSection) {
        processingSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);

    let publicUrl = '';
    let fileName = '';

    try {
      // Simular upload
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Processar com IA real - simular progresso da extração
      const aiSteps = [
        { progress: 10, status: '🔍 Analisando estrutura do PDF...' },
        { progress: 25, status: '📄 Extraindo texto das páginas...' },
        { progress: 40, status: '🤖 Conectando com IA especializada...' },
        { progress: 60, status: '⚙️ IA analisando dados do contrato...' },
        { progress: 75, status: '💡 Identificando cliente e equipamentos...' },
        { progress: 90, status: '📊 Calculando valores e processando dados...' },
        { progress: 95, status: '✨ Finalizando análise inteligente...' }
      ];

      // Simular progresso da análise
      for (const step of aiSteps) {
        setExtractionProgress(step.progress);
        setProcessingStatus(step.status);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Converter arquivo para base64
      const fileBuffer = await selectedFile.arrayBuffer();
      const fileBase64 = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Status mais detalhado da IA real
      setProcessingStatus('🚀 Enviando para análise IA especializada...');
      setExtractionProgress(100);

      // Mostrar que está conectando com IA
      await new Promise(resolve => setTimeout(resolve, 500));
      setProcessingStatus('🔗 Conectando com sistema de análise avançada...');

      await new Promise(resolve => setTimeout(resolve, 300));
      setProcessingStatus('⚡ IA processando documento em tempo real...');

      // Upload to Supabase Storage first
      // Sanitize filename: remove special characters and spaces
      const sanitizedFileName = selectedFile.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      fileName = `contracts/temp/${Date.now()}-${sanitizedFileName}`;
      setProcessingStatus('📤 Enviando arquivo para nuvem...');

      // Convert base64 to blob
      const base64Response = await fetch(`data:application/pdf;base64,${fileBase64}`);
      const blob = await base64Response.blob();
      const file = new File([blob], sanitizedFileName, { type: 'application/pdf' });

      console.log('📤 Tentando upload do arquivo:', {
        bucket: CONTRACT_DOCUMENTS_BUCKET,
        fileName: fileName,
        fileSize: file.size
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error details:', uploadError);
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
      }

      console.log('✅ Upload realizado com sucesso:', uploadData);

      // Get signed URL (válida por 1 hora) para backend processar
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .createSignedUrl(fileName, 3600); // 1 hora de validade

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('❌ Erro ao gerar signed URL:', signedUrlError);
        throw new Error('Erro ao gerar URL de acesso temporário');
      }

      publicUrl = signedUrlData.signedUrl;
      console.log('🔗 Signed URL gerada:', publicUrl);
      
      setProcessingStatus('✨ Processando com IA...');

      // Initialize SSE for real-time progress
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      try {
        await initializeSSEProgress(sessionId);
      } catch (sseError) {
        console.warn('Failed to initialize SSE, falling back to polling:', sseError);
        // Continue with regular processing if SSE fails
      }

      // Call API with file URL
      const apiUrl = getApiUrl('/api/process-pdf-storage');
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      const timeout = getTimeoutForFileSize(fileSizeMB);
      const isLargeFile = fileSizeMB > 10;

      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response: Response;
      try {
        // Use resilient fetch with network interruption handling
        response = await resilientFetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: publicUrl,
            filename: selectedFile.name,
            contractId: `contract-${Date.now()}`,
            storagePath: fileName,
            asyncProcessing: isLargeFile, // Enable async processing for large files
            fileSizeMB: fileSizeMB,
            sessionId: sessionId // Add session ID for SSE tracking
          }),
          signal: controller.signal
        }, 3); // Max 3 retry attempts for main processing

        clearTimeout(timeoutId);

        if (isLargeFile && response.status === 202) {
          // Handle async processing response
          const asyncResult = await response.json();

          // Add job to background jobs
          setBackgroundJobs(prev => {
            const newJobs = new Map(prev);
            newJobs.set(asyncResult.jobId, {
              jobId: asyncResult.jobId,
              status: 'processing',
              filename: selectedFile.name
            });
            return newJobs;
          });

          toast({
            title: "Processamento iniciado",
            description: `Arquivo "${selectedFile.name}" foi enviado para processamento em segundo plano. Você será notificado quando concluir.`,
            variant: "default"
          });

          setProcessingStatus('🔄 Processamento em segundo plano...');
          setIsProcessing(false);
          setIsLocked(false);

          // Start polling for job status
          pollJobStatus(asyncResult.jobId);
          return;
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        cleanupSSEConnection(); // Clean up SSE connection on any error

        // Enhanced error handling with network interruption detection
        const errorDetails = handleApiError(fetchError);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          toast({
            title: "⏱️ Timeout no processamento",
            description: `O processamento excedeu o tempo limite de ${timeout/1000}s. Tente novamente ou use arquivos menores.`,
            variant: "destructive"
          });
          setProcessingStatus('❌ Timeout - Processamento interrompido');
        } else if (errorDetails.isNetworkError) {
          toast({
            title: "🌐 Problema de Conectividade",
            description: `${errorDetails.message} O sistema tentou reconectar automaticamente mas não conseguiu estabelecer uma conexão estável.`,
            variant: "destructive"
          });
          setProcessingStatus('❌ Erro de rede - Verifique sua conexão');
        } else if (errorDetails.isTimeout) {
          toast({
            title: "⏱️ Tempo Limite Excedido",
            description: errorDetails.message,
            variant: "destructive"
          });
          setProcessingStatus('❌ Timeout - Processamento muito lento');
        } else {
          toast({
            title: "❌ Erro no Processamento",
            description: errorDetails.message,
            variant: "destructive"
          });
          setProcessingStatus('❌ Erro no processamento');
        }

        setIsProcessing(false);
        setIsLocked(false);
        return;
      }

      const result = await response.json();

      // Store extracted text and file info from API response
      // Backend returns extractedText (camelCase) not extracted_text
      if (result.extractedText) {
        setApiExtractedText(result.extractedText);
        console.log('📝 Texto extraído do PDF salvo:', result.extractedText.substring(0, 200) + '...');
        console.log('📊 Total de caracteres extraídos:', result.extractedTextLength || result.extractedText.length);
      } else if (result.extracted_text) {
        // Fallback for snake_case
        setApiExtractedText(result.extracted_text);
        console.log('📝 Texto extraído do PDF salvo (snake_case):', result.extracted_text.substring(0, 200) + '...');
      } else {
        console.warn('⚠️ Nenhum texto extraído retornado pela API');
      }

      if (selectedFile) {
        setUploadedFileName(fileName); // Usar o caminho completo do storage, não o nome original
        setUploadedFileSize(selectedFile.size);
      }

      if (!response.ok) {
        // Handle 422 - PDF extraction issues
        if (response.status === 422) {
          const errorDetails = result.error || 'Erro na extração do PDF';
          
          // Enhanced OCR error handling with specific messages
          if (errorDetails.includes('PDF parece ser apenas imagem') ||
              errorDetails.includes('PDF Escaneado Detectado') ||
              errorDetails.includes('OCR') ||
              errorDetails.includes('escaneado')) {

            let ocrMessage = {
              title: "⚠️ PDF Escaneado Detectado",
              description: "Este PDF parece conter apenas imagens. O sistema tentará processar com IA, mas os resultados podem ser limitados."
            };

            // Specific OCR error messages
            if (errorDetails.includes('baixa qualidade')) {
              ocrMessage = {
                title: "📄 PDF de Baixa Qualidade",
                description: "O PDF tem qualidade de imagem baixa. Recomenda-se usar um arquivo com maior resolução para melhor precisão."
              };
            } else if (errorDetails.includes('texto ilegível')) {
              ocrMessage = {
                title: "🔍 Texto Ilegível Detectado",
                description: "Algumas partes do documento são difíceis de ler. O sistema fará o melhor para extrair as informações possíveis."
              };
            } else if (errorDetails.includes('OCR necessário')) {
              ocrMessage = {
                title: "🤖 OCR Requerido",
                description: "Este documento precisa de OCR (reconhecimento de texto). O processamento pode demorar mais tempo."
              };
            } else if (errorDetails.includes('PDF protegido')) {
              ocrMessage = {
                title: "🔒 PDF Protegido",
                description: "O PDF tem proteções que dificultam a extração. Tente remover as proteções ou usar uma versão desbloqueada."
              };
            }

            toast({
              title: ocrMessage.title,
              description: ocrMessage.description,
              variant: "default",
              duration: 8000
            });

            console.warn(`⚠️ OCR Issue: ${errorDetails} - continuando processamento com IA`);

            // Continue processing with AI despite OCR issues
          }
        }
        
        // Se for erro de CNPJ, avisar mas continuar processamento
        if (result.error && result.error.includes('CNPJ')) {
          // Backend melhorado deve encontrar CNPJ em vários formatos
          // NUNCA pedir preenchimento manual - sempre processar automaticamente
          toast({
            title: "⚠️ CNPJ não detectado automaticamente",
            description: "O sistema tentará processar mesmo sem CNPJ completo.",
            variant: "default"
          });

          // Continue com dados parciais se houver - SEM preenchimento manual
          if (result.data) {
            const partialData = result.data;
            // NÃO usar PREENCHER_CNPJ - deixar vazio ou como veio do backend
            partialData.needs_review = true;

            // Continuar processamento com IA mesmo sem CNPJ
            console.warn('⚠️ CNPJ não detectado - continuando com processamento automático');
          }
          // NÃO retornar - continuar com o fluxo normal
        }
        throw new Error(result.error || 'Erro na análise IA');
      }

      if (!result.success) {
        // If backend returns success: false with error about text extraction, stop completely
        if (result.error && (
          result.error.includes('não foi possível extrair texto') ||
          result.error.includes('não contém texto extraível') ||
          result.error.includes('CNPJ não identificado no documento') ||
          result.error.includes('escaneado sem OCR') ||
          result.error.includes('Dados do cliente inválidos')
        )) {
          toast({
            title: "❌ Extração Falhou",
            description: result.error || "Não foi possível extrair dados do PDF",
            variant: "destructive",
            duration: 7000
          });
          setIsProcessing(false);
          setProcessingStatus('');
          setExtractedData(null);
          // STOP COMPLETELY - Don't create contract with empty data
          return;
        }

        // Check for other validation errors
        if (result.validation_errors && result.validation_errors.length > 0) {
          toast({
            title: "❌ Validação Falhou",
            description: result.validation_errors.join(', '),
            variant: "destructive"
          });
          setIsProcessing(false);
          setProcessingStatus('');
          setExtractedData(null);
          return; // Stop processing completely
        }

        // For any other error, stop processing
        toast({
          title: "❌ Erro no processamento",
          description: result.error || "Erro desconhecido",
          variant: "destructive"
        });
        setIsProcessing(false);
        setProcessingStatus('');
        setExtractedData(null);
        return;
      }

      setProcessingStatus('✅ IA finalizou análise! Organizando dados...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStatus('📊 Processando dados extraídos pela IA...');

      const apiData = result.data;

      // NUNCA bloquear - sempre tentar processar
      const hasNoData = !apiData?.client_name &&
                        !apiData?.contract_value &&
                        !apiData?.start_date &&
                        !apiData?.client_cnpj;

      if (hasNoData) {
        console.warn('⚠️ Poucos dados extraídos do PDF - continuando mesmo assim');

        toast({
          title: "⚠️ Extração Parcial",
          description: "Alguns dados não foram extraídos. O sistema tentará processar com as informações disponíveis.",
          variant: "default",
          duration: 5000
        });

        // Continuar processamento mesmo sem dados completos
        // A IA tentará gerar o máximo possível
      }

      // Backend agora faz extração inteligente de CNPJ
      // Aqui apenas verificamos se foi extraído
      const extractedCnpj = (apiData?.client_cnpj || '').replace(/\D/g, '');
      const cnpjExtracted = result.cnpj_extracted || apiData?.client_cnpj;

      // Se o backend já formatou o CNPJ, usar diretamente
      if (cnpjExtracted && cnpjExtracted.includes('.') && cnpjExtracted.includes('/')) {
        apiData.client_cnpj = cnpjExtracted;
        console.log('✅ CNPJ formatado pelo backend:', cnpjExtracted);
      } else if (!extractedCnpj || extractedCnpj.length < 14) {
        console.warn('⚠️ CNPJ não encontrado ou incompleto:', apiData?.client_cnpj);

        // AVISAR mas NÃO BLOQUEAR - continuar processamento
        toast({
          title: "⚠️ CNPJ Não Detectado",
          description: "O CNPJ não foi encontrado automaticamente. O sistema continuará processando com os dados disponíveis.",
          variant: "default",
          duration: 5000
        });

        // Marcar que precisa revisão mas continuar
        apiData.client_cnpj = apiData?.client_cnpj || 'NÃO_IDENTIFICADO';
        apiData.needs_review = true;
      } else if (extractedCnpj.length === 14) {
        console.warn('⚠️ CNPJ com formato não padrão:', apiData?.client_cnpj, 'Dígitos:', extractedCnpj.length);

        // Avisar mas continuar
        toast({
          title: "⚠️ CNPJ com Formato Diferente",
          description: `CNPJ detectado com ${extractedCnpj.length} dígitos. Verifique se está correto.`,
          variant: "default"
        });
      }
      
      console.log('🔍 DADOS BRUTOS DA API:', apiData);
      console.log('🔍 ESTRUTURA COMPLETA DO RESULT:', result);
      console.log('🔧 EQUIPMENT DATA FROM API:', apiData?.equipment);
      console.log('👤 [DEBUG] TODOS OS CAMPOS CLIENT_* DA API:', {
        client_name: apiData?.client_name,
        client_legal_name: apiData?.client_legal_name,
        client_cnpj: apiData?.client_cnpj,
        client_email: apiData?.client_email,
        client_phone: apiData?.client_phone,
        client_address: apiData?.client_address,
        client_city: apiData?.client_city,
        client_state: apiData?.client_state,
        client_zip_code: apiData?.client_zip_code,
        client_contact_person: apiData?.client_contact_person
      });
      
      if (!apiData) {
        console.error('❌ ERRO: apiData está vazio!', result);
        throw new Error('Dados não extraídos corretamente');
      }

      // Garantir número de contrato único
      const uniqueContractNumber = await ensureUniqueContractNumber(apiData.contract_number);
      
      console.log('📝 DADOS DO CLIENTE NA API - NOME FANTASIA vs RAZÃO SOCIAL:', {
        client_name: apiData.client_name,
        client_legal_name: apiData.client_legal_name,
        client_cnpj: apiData.client_cnpj,
        client_email: apiData.client_email,
        client_phone: apiData.client_phone
      });
      
      console.log('📅 DATAS DO CONTRATO NA API:', {
        contract_date: apiData.contract_date,
        proposal_date: apiData.proposal_date,
        start_date: apiData.start_date,
        end_date: apiData.end_date,
        duration_months: apiData.duration_months
      });
      
      console.log('💰 VALORES FINANCEIROS NA API:', {
        monthly_value: apiData.monthly_value,
        contract_value: apiData.contract_value,
        calculated: apiData.monthly_value && apiData.duration_months ? 
          apiData.monthly_value * apiData.duration_months : 'não calculado'
      });
      
      console.log('⚙️ DADOS DO EQUIPAMENTO NA API:', apiData.equipment);

      // Calcular datas de início e fim se não estiverem disponíveis
      let calculatedStartDate = apiData.start_date || '';
      let calculatedEndDate = apiData.end_date || '';
      
      // Enhanced date processing with robust validation
      // Clean and validate contract_date
      const cleanContractDate = parseAndCleanDate(apiData.contract_date);
      if (cleanContractDate && !calculatedStartDate) {
        calculatedStartDate = cleanContractDate;
      }

      // Clean and validate start_date
      const cleanStartDate = parseAndCleanDate(apiData.start_date);
      if (cleanStartDate) {
        calculatedStartDate = cleanStartDate;
      }

      // Clean and validate end_date
      const cleanEndDate = parseAndCleanDate(apiData.end_date);
      if (cleanEndDate) {
        calculatedEndDate = cleanEndDate;
      }

      // Calculate missing end_date from start_date + duration
      if (calculatedStartDate && !calculatedEndDate && apiData.duration_months) {
        try {
          const durationMonths = parseInt(String(apiData.duration_months));
          if (!isNaN(durationMonths) && durationMonths > 0) {
            calculatedEndDate = addMonths(calculatedStartDate, durationMonths);
          }
        } catch (e) {
          console.warn('Erro ao calcular end_date:', e);
        }
      }

      // Calculate missing duration from start_date and end_date
      if (calculatedStartDate && calculatedEndDate && !apiData.duration_months) {
        try {
          const start = new Date(calculatedStartDate);
          const end = new Date(calculatedEndDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffMonths = Math.round(diffDays / 30);
            if (diffMonths > 0) {
              apiData.duration_months = diffMonths;
            }
          }
        } catch (e) {
          console.warn('Erro ao calcular duração:', e);
        }
      }

      console.log('📅 DATAS CALCULADAS:', {
        original_start: apiData.start_date,
        original_end: apiData.end_date,
        contract_date: apiData.contract_date,
        calculated_start: calculatedStartDate,
        calculated_end: calculatedEndDate,
        duration_months: apiData.duration_months
      });

      // Mapear dados da API para a interface ExtractedData
      // Backend pode retornar campos com ou sem prefixo "client_"
      const extractedData: ExtractedData = {
        // Informações do Contrato
        contract_number: apiData.contract_number || uniqueContractNumber,
        contract_value: parseFloat(apiData.contract_value) || 0,
        monthly_value: parseFloat(apiData.monthly_value) || undefined,
        duration_months: parseFloat(apiData.duration_months) || undefined,
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        contract_type: apiData.contract_type || 'maintenance',

        // Informações COMPLETAS do Cliente - Buscar com E SEM prefixo client_
        client_name: apiData.client_name || apiData.name || apiData.client_legal_name || apiData.legal_name || '',
        client_legal_name: apiData.client_legal_name || apiData.legal_name || apiData.client_name || apiData.name || '',
        client_cnpj: apiData.client_cnpj || apiData.cnpj || '',
        client_needs_review: !apiData.client_name && !apiData.name && !apiData.client_legal_name && !apiData.legal_name, // Flag para revisar cliente
        client_email: apiData.client_email || apiData.email || '',
        client_phone: apiData.client_phone || apiData.phone || apiData.telefone || '',
        client_address: apiData.client_address || apiData.address || apiData.endereco || '',
        client_neighborhood: apiData.client_neighborhood || apiData.neighborhood || apiData.bairro || '',
        client_number: apiData.client_number || apiData.number || apiData.numero || '',
        client_city: apiData.client_city || apiData.city || apiData.cidade || '',
        client_state: apiData.client_state || apiData.state || apiData.estado || apiData.uf || '',
        client_zip_code: apiData.client_zip_code || apiData.zip_code || apiData.cep || '',
        client_contact_person: apiData.client_contact_person || apiData.contact_person || apiData.pessoa_contato || '',
        
        // Informações COMPLETAS do Equipamento - com conversão segura para string
        equipment_type: safeString(apiData.equipment?.type),
        equipment_model: safeString(apiData.equipment?.model),
        equipment_serial: safeString(apiData.equipment?.serial_number),
        equipment_location: safeString(apiData.equipment?.location),
        equipment_power: safeString(apiData.equipment?.power),
        equipment_voltage: safeString(apiData.equipment?.voltage),
        equipment_brand: safeString(apiData.equipment?.brand),
        equipment_year: safeString(apiData.equipment?.year),
        equipment_condition: safeString(apiData.equipment?.condition),
        
        // Serviços e Observações
        services: apiData.services || [],
        observations: apiData.observations || '',
        payment_terms: apiData.payment_terms || '',
        technical_notes: apiData.technical_notes || '',
        special_conditions: apiData.special_conditions || '',
        warranty_terms: apiData.warranty_terms || ''
      };

      console.log('✅ DADOS APÓS MAPEAMENTO:', extractedData);
      console.log('👤 CLIENTE MAPEADO:', {
        client_name: extractedData.client_name,
        client_cnpj: extractedData.client_cnpj,
        client_email: extractedData.client_email,
        client_phone: extractedData.client_phone
      });
      console.log('⚙️ EQUIPAMENTO MAPEADO:', {
        equipment_type: extractedData.equipment_type,
        equipment_model: extractedData.equipment_model,
        equipment_brand: extractedData.equipment_brand,
        equipment_power: extractedData.equipment_power
      });

      // Debug: Log da estrutura completa do equipamento da API
      console.log('🔧 ESTRUTURA EQUIPMENT DA API:', apiData.equipment);
      console.log('🔧 DADOS EQUIPMENT EXTRAÍDOS:', {
        'apiData.equipment?.type': apiData.equipment?.type,
        'apiData.equipment?.model': apiData.equipment?.model,
        'apiData.equipment?.brand': apiData.equipment?.brand,
        'apiData.equipment?.power': apiData.equipment?.power,
        'apiData.equipment?.voltage': apiData.equipment?.voltage,
        'apiData.equipment?.serial_number': apiData.equipment?.serial_number,
        'apiData.equipment?.location': apiData.equipment?.location,
        'apiData.equipment?.year': apiData.equipment?.year,
        'apiData.equipment?.condition': apiData.equipment?.condition
      });
      console.log('📋 SERVIÇOS E OBSERVAÇÕES:', {
        services: extractedData.services,
        observations: extractedData.observations
      });

      console.log('📦 [ANTES DE SETAR] extractedData completo:', extractedData);
      console.log('📦 [ANTES DE SETAR] Campos críticos client_*:', {
        client_name: extractedData.client_name,
        client_cnpj: extractedData.client_cnpj,
        client_email: extractedData.client_email,
        client_phone: extractedData.client_phone,
        client_address: extractedData.client_address,
        client_city: extractedData.client_city,
        client_state: extractedData.client_state,
        client_zip_code: extractedData.client_zip_code,
        client_contact_person: extractedData.client_contact_person
      });
      const sanitizedData = sanitizeServicesInData(extractedData);

      setExtractedData(sanitizedData);
      setEditedData(sanitizedData);
      setServicesInput(''); // Inicializar vazio para modo de edição

      // Verificar se o cliente já existe
      const foundClient = await checkExistingClient(
        extractedData.client_name,
        extractedData.client_cnpj
      );

      if (foundClient) {
        // Cliente já existe - sempre mostrar diálogo para usuário decidir
        setExistingClient(foundClient);
        setShowClientDialog(true);
        // Não resetar isProcessing aqui - será feito no finally apenas se diálogo não estiver ativo
        console.log(`✅ Cliente encontrado: ${foundClient.name} (${foundClient.contracts_count || 0} contratos existentes)`);
        return; // Pausar aqui e aguardar decisão do usuário
      } else {
        // Cliente novo - marcar como novo e continuar o processo
        setClientChoice('new');

        toast({
          title: "Novo cliente detectado",
          description: `Nova pasta será criada para ${extractedData.client_name}`,
        });

        // Importante: Manter o processo ativo para permitir que o usuário confirme e salve
        // O estado isProcessing será resetado apenas quando o usuário cancelar ou confirmar
        setIsProcessing(false); // Permitir que o usuário interaja com os botões
        setIsLocked(false); // Destravar interface para permitir edição/confirmação
      }

    } catch (error) {
      // Enhanced error handling with timeout and network error detection
      const apiError = handleApiError(error);

      // Log detailed error information
      const errorInfo = logDetailedError(error, 'File Processing', {
        apiCall: 'process-pdf-storage',
        fileUrl: publicUrl,
        retryAttempt: retryCount,
        isTimeout: apiError.isTimeout,
        isNetworkError: apiError.isNetworkError,
        timeoutDetails: apiError.details
      });

      // Special handling for timeout errors
      if (apiError.isTimeout) {
        toast({
          title: "⏰ Timeout de processamento",
          description: `${apiError.message}. Arquivo muito grande pode demorar mais para processar.`,
          variant: "destructive"
        });

        // For timeout errors, allow retry
        if (apiError.retryable && retryCount < maxRetries) {
          toast({
            title: "🔄 Tentativa de reprocessamento",
            description: "Tentando novamente com timeout estendido...",
            variant: "default"
          });

          try {
            await retryExtraction(true);
            return;
          } catch (retryError) {
            const retryApiError = handleApiError(retryError);
            toast({
              title: "❌ Falha na nova tentativa",
              description: retryApiError.message,
              variant: "destructive"
            });
          }
        }
      } else if (apiError.isNetworkError) {
        // Network error handling
        toast({
          title: "🌐 Erro de conexão",
          description: apiError.message,
          variant: "destructive"
        });

        if (apiError.retryable) {
          // Offer retry for network errors
          try {
            await retryExtraction(true);
            return;
          } catch (retryError) {
            // If retry also failed, try fallback methods
            try {
              const fallbackResult = await tryFallbackExtraction(publicUrl, selectedFile.name);
              if ((fallbackResult as any)?.success) {
                setProcessingStatus('✅ Sucesso com método alternativo!');
                return;
              }
            } catch (fallbackError) {
              logDetailedError(fallbackError, 'Fallback Processing Failed');
            }
          }
        }
      } else {
        // Other errors (server, validation, etc.)
        const friendlyError = getUserFriendlyErrorMessage(apiError.message);

        toast({
          title: friendlyError.title,
          description: friendlyError.description,
          variant: friendlyError.variant
        });

        // Check if we should retry for non-timeout/non-network errors
        if (apiError.retryable && shouldRetry(apiError.message)) {
          try {
            await retryExtraction(true);
            return;
          } catch (retryError) {
            try {
              const fallbackResult = await tryFallbackExtraction(publicUrl, selectedFile.name);
              if ((fallbackResult as any)?.success) {
                setProcessingStatus('✅ Sucesso com método alternativo!');
                return;
              }
            } catch (fallbackError) {
              logDetailedError(fallbackError, 'Fallback Processing Failed');
            }
          }
        }
      }

      // Always clean up state on error
      cleanupSSEConnection(); // Clean up SSE connection on error
      setIsProcessing(false);
      setIsLocked(false);
      setProcessingStatus('');
      setExtractedData(null);

      // Mostrar tooltip único e fechar modal
      toast({
        title: "⚠️ Houve um problema no upload do contrato",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });

      // Fechar modal após 2 segundos
      setTimeout(() => {
        handleCancel();
      }, 2000);
    } finally {
      // Garantir que o processamento seja parado apenas se não houver diálogo ativo
      if (!showClientDialog) {
        cleanupSSEConnection(); // Clean up SSE connection when not showing dialog
        setIsProcessing(false);
        setIsLocked(false); // Destravar após processar para permitir interação com botões
      }
    }
  };

  const handleClientChoice = async (choice: 'existing' | 'new') => {
    setClientChoice(choice);
    setShowClientDialog(false);
    
    // Apenas salvar a escolha, não processar ainda
    if (choice === 'existing' && existingClient) {
      toast({
        title: "Pasta selecionada",
        description: `Contrato será adicionado à pasta de ${existingClient.name}`,
      });
    } else {
      toast({
        title: "Nova pasta",
        description: `Nova pasta será criada ao confirmar`,
      });
    }
  };
  
  // Nova função para confirmar e salvar
  const handleConfirmAndSave = async () => {
    const dataSource = editedData || extractedData;

    console.log('🔍 [CONFIRM AND SAVE] dataSource:', dataSource);
    console.log('🔍 [CONFIRM AND SAVE] editedData:', editedData);
    console.log('🔍 [CONFIRM AND SAVE] extractedData:', extractedData);

    if (!dataSource) {
      toast({
        title: "Erro",
        description: "Nenhum dado extraído para salvar",
        variant: "destructive"
      });
      return;
    }
    const workingData = { ...dataSource } as ExtractedData;

    console.log('💾 [CONFIRM AND SAVE] workingData após spread:', workingData);
    console.log('👤 [CONFIRM AND SAVE] Campos client_* do workingData:', {
      client_name: workingData.client_name,
      client_cnpj: workingData.client_cnpj,
      client_email: workingData.client_email,
      client_phone: workingData.client_phone,
      client_address: workingData.client_address,
      client_city: workingData.client_city,
      client_state: workingData.client_state,
      client_zip_code: workingData.client_zip_code,
      client_contact_person: workingData.client_contact_person
    });

    // Usar os serviços do array quando em modo de edição, senão converter de texto
    if (isEditingData) {
      // Manter os serviços como array quando em modo de edição
      workingData.services = Array.isArray(workingData.services) ? workingData.services : [];
    } else {
      // Converter de texto para array quando não em modo de edição
      workingData.services = servicesToArray(servicesToText(workingData.services));
    }

    workingData.payment_terms = workingData.payment_terms?.trim() || '';
    workingData.technical_notes = workingData.technical_notes?.trim() || '';
    workingData.special_conditions = workingData.special_conditions?.trim() || '';
    workingData.warranty_terms = workingData.warranty_terms?.trim() || '';

    // Validar CNPJ antes de salvar usando a nova função de validação
    const cnpjToValidate = workingData?.client_cnpj || '';
    const cnpjValidation = validateCNPJWithDetails(cnpjToValidate);

    // Se o CNPJ é inválido, bloquear o salvamento
    if (!cnpjValidation.isValid && cnpjValidation.cleaned.length > 0) {
      // Se tem algum valor mas é inválido, bloquear
      toast({
        title: "❌ CNPJ Inválido",
        description: cnpjValidation.errorMessage || "Por favor, corrija o CNPJ antes de continuar.",
        variant: "destructive"
      });

      // Focar no campo de edição se estiver editando
      if (isEditingData) {
        setCnpjError(cnpjValidation.errorMessage);
        return;
      }

      // Perguntar se deseja editar os dados
      const wantToEdit = window.confirm(
        "O CNPJ informado é inválido.\n\n" +
        `Erro: ${cnpjValidation.errorMessage}\n\n` +
        "Deseja editar os dados agora?"
      );

      if (wantToEdit) {
        setIsEditingData(true);
        const sanitizedWorking = sanitizeServicesInData(workingData);
        setEditedData(sanitizedWorking);
        setServicesInput(''); // Inicializar vazio para modo de edição
        if (!editedData) {
          setExtractedData(sanitizedWorking);
        }
        setCnpjError(cnpjValidation.errorMessage);
      }
      return;
    }

    // Se não tem CNPJ, avisar mas permitir continuar
    if (!cnpjValidation.cleaned || cnpjValidation.cleaned.length === 0) {
      const confirmSave = window.confirm(
        "⚠️ ATENÇÃO: Nenhum CNPJ foi informado.\n\n" +
        "Deseja continuar sem CNPJ?\n\n" +
        "Recomendamos adicionar o CNPJ para melhor controle dos contratos."
      );

      if (!confirmSave) {
        setIsEditingData(true);
        const sanitizedWorking = sanitizeServicesInData(workingData);
        setEditedData(sanitizedWorking);
        setServicesInput(''); // Inicializar vazio para modo de edição
        if (!editedData) {
          setExtractedData(sanitizedWorking);
        }
        setCnpjError("CNPJ é obrigatório");
        return;
      }

      // Marcar como pendente se o usuário escolher continuar
      workingData.client_cnpj = 'PENDENTE_REVISAO';
    } else {
      // CNPJ válido - usar o formato correto
      workingData.client_cnpj = cnpjValidation.formatted;
    }
    
    // Validate client name
    const clientName = workingData?.client_name || '';
    if (!clientName || clientName.length <= 1) {
      toast({
        title: "❌ Nome do Cliente Inválido",
        description: "É necessário um nome de cliente válido para salvar o contrato.",
        variant: "destructive"
      });
      return;
    }

    const sanitizedWorkingForSave = sanitizeServicesInData(workingData);

    if (editedData) {
      setEditedData(sanitizedWorkingForSave);
      setServicesInput(''); // Inicializar vazio para modo de edição
    } else {
      setExtractedData(sanitizedWorkingForSave);
    }

    // Usar a escolha que foi feita antes
    if (clientChoice === 'existing' && existingClient) {
      await createContractWithClient(workingData, existingClient.id, apiExtractedText, uploadedFileName, uploadedFileSize);
    } else {
      await createContractWithClient(workingData, null, apiExtractedText, uploadedFileName, uploadedFileSize);
    }

    // Fechar o dialog após salvar
    if (onContractCreated) {
      onClose();
    }
  };
  

  const createContractWithClient = async (data: ExtractedData, existingClientId: string | null, extractedText?: string, fileName?: string, fileSize?: number) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    // Validação final do CNPJ antes de salvar no banco - mais inteligente
    const cnpj = (data?.client_cnpj || '').replace(/\D/g, '');

    // Se o CNPJ está completamente ausente ou muito curto
    if (!cnpj || cnpj.length < 8) {
      console.warn('⚠️ CNPJ ausente ou muito curto ao salvar:', data?.client_cnpj);

      // Permitir salvar mas marcar como pendente de revisão
      data.client_cnpj = data.client_cnpj || 'AGUARDANDO_CNPJ';

      toast({
        title: "⚠️ Contrato salvo com CNPJ pendente",
        description: "O contrato foi salvo, mas o CNPJ precisa ser adicionado posteriormente.",
        variant: "default"
      });
    } else if (cnpj.length !== 14) {
      console.warn('⚠️ CNPJ com tamanho não padrão:', cnpj.length, 'dígitos');

      // Permitir mas avisar
      toast({
        title: "⚠️ CNPJ com formato não padrão",
        description: `O CNPJ tem ${cnpj.length} dígitos. Verifique se está correto.`,
        variant: "default"
      });
    }

    // Validate client name
    const clientName = data?.client_name || '';
    if (!clientName || clientName.length <= 1) {
      toast({
        title: "❌ Erro: Nome do Cliente Inválido",
        description: "Nome do cliente é obrigatório e deve ter mais de 1 caractere.",
        variant: "destructive"
      });
      setIsProcessing(false);
      setIsLocked(false);
      return;
    }

    // Obter o user_id correto
    const userId = user?.id;
    if (!userId) {
      toast({
        title: "Erro",
        description: "ID do usuário não encontrado",
        variant: "destructive"
      });
      return;
    }

    if (hasSavedContract) {
      console.warn('⚠️ Tentativa duplicada de salvar contrato detectada. Ignorando ação.');
      toast({
        title: "Contrato já criado",
        description: "Este contrato já foi salvo. Inicie um novo upload para criar outro registro.",
        variant: "default"
      });
      return;
    }

    setIsProcessing(true);
    setIsLocked(true); // Travar interface durante salvamento
    setProcessingStatus('Salvando contrato...');
    setHasSavedContract(true);

    try {
      // Garantir número de contrato único antes de salvar
      const uniqueContractNumber = await ensureUniqueContractNumber(data.contract_number);
      console.log(`Aplicando número único: ${data.contract_number} → ${uniqueContractNumber}`);
      
      let clientId = existingClientId;

      // Se não tem cliente existente, usar findOrCreateClient (multi-tenant)
      if (!clientId) {
        console.log('🔍 Buscando ou criando cliente (multi-tenant)...');

        const { client: clientRecord, isNew, wasShared } = await findOrCreateClient(
          {
            name: data.client_name,
            cnpj: data.client_cnpj || '',
            email: data.client_email || '',
            phone: data.client_phone || '',
            address: data.client_address || '',
            neighborhood: data.client_neighborhood || '',
            number: data.client_number || '',
            city: data.client_city || '',
            state: data.client_state || '',
            zip_code: data.client_zip_code || '',
            contact_person: data.client_contact_person || '',
            emergency_contact: data.client_contact_person || ''
          },
          userId
        );

        clientId = clientRecord.id;

        if (isNew) {
          console.log('✅ Novo cliente criado:', clientRecord.id);
          toast({
            title: "Cliente criado",
            description: `Nova pasta criada para ${data.client_name}`,
          });
        } else if (wasShared) {
          console.log('🔗 Cliente compartilhado com usuário:', clientRecord.id);
          toast({
            title: "Cliente compartilhado",
            description: `Cliente ${data.client_name} já existe e foi compartilhado com você`,
          });
        } else {
          console.log('✅ Cliente existente reutilizado:', clientRecord.id);
          toast({
            title: "Cliente existente",
            description: `Contrato adicionado à pasta de ${data.client_name}`,
          });
        }
      } else {
        // Atualizar dados do cliente existente se houver informações novas
        console.log('📝 Atualizando cliente existente com dados extraídos da IA...');
        console.log('🔍 Dados para atualização:', {
          client_email: data.client_email,
          client_phone: data.client_phone,
          client_address: data.client_address,
          client_neighborhood: data.client_neighborhood,
          client_number: data.client_number,
          client_city: data.client_city,
          client_state: data.client_state,
          client_zip_code: data.client_zip_code,
          client_contact_person: data.client_contact_person
        });

        const updateData: Record<string, any> = {};
        if (data.client_email) updateData.email = data.client_email;
        if (data.client_phone) updateData.phone = data.client_phone;
        if (data.client_address) updateData.address = data.client_address;
        if (data.client_neighborhood) updateData.neighborhood = data.client_neighborhood;
        if (data.client_number) updateData.number = data.client_number;
        if (data.client_city) updateData.city = data.client_city;
        if (data.client_state) updateData.state = data.client_state;
        if (data.client_zip_code) updateData.zip_code = data.client_zip_code;
        if (data.client_contact_person) {
          updateData.contact_person = data.client_contact_person;
          updateData.emergency_contact = data.client_contact_person;
        }

        console.log('💾 Dados que serão atualizados na tabela clients:', updateData);

        if (Object.keys(updateData).length > 0) {
          const { data: updatedClient, error: updateError } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', clientId)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Erro ao atualizar cliente:', updateError);
          } else {
            console.log('✅ Cliente atualizado com sucesso:', updatedClient);
          }
        } else {
          console.log('⚠️ Nenhum dado novo para atualizar no cliente');
        }

        toast({
          title: "Cliente atualizado",
          description: `Contrato adicionado à pasta existente de ${data.client_name}`,
        });
      }

      // Criar o contrato - usando TODOS os campos extraídos
      console.log('📋 [CREATE CONTRACT] Dados recebidos do data parameter:', {
        client_name: data.client_name,
        client_legal_name: data.client_legal_name,
        client_cnpj: data.client_cnpj,
        client_email: data.client_email,
        client_phone: data.client_phone,
        client_address: data.client_address,
        client_city: data.client_city,
        client_state: data.client_state,
        client_zip_code: data.client_zip_code,
        client_contact_person: data.client_contact_person
      });

      const normalizeTextField = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.toString().trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const normalizedServices = Array.isArray(data.services)
        ? data.services
            .map(service => {
              const value = safeString(service);
              return value.trim();
            })
            .filter(Boolean)
        : [];
      const normalizedObservations = normalizeTextField(data.observations);
      const normalizedPaymentTerms = normalizeTextField(data.payment_terms);
      const normalizedTechnicalNotes = normalizeTextField(data.technical_notes);
      const normalizedSpecialConditions = normalizeTextField(data.special_conditions);
      const normalizedWarrantyTerms = normalizeTextField(data.warranty_terms);
      // const normalizedSupplierName = normalizeTextField(data.supplier_name);
      // const normalizedSupplierCnpj = normalizeTextField(data.supplier_cnpj);

      const contractData: any = {
        user_id: userId,
        client_id: clientId,
        contract_number: uniqueContractNumber,

        // DADOS DO CLIENTE (salvos no contrato para histórico)
        client_name: data.client_name,
        client_legal_name: data.client_legal_name || null,
        client_cnpj: data.client_cnpj || null,
        client_email: data.client_email || null,
        client_phone: data.client_phone || null,
        client_address: data.client_address || null,
        client_neighborhood: data.client_neighborhood || null,
        client_number: data.client_number || null,
        client_city: data.client_city || null,
        client_state: data.client_state || null,
        client_zip_code: data.client_zip_code || null,
        client_contact_person: data.client_contact_person || null,

        // DADOS DO CONTRATO
        value: data.contract_value || 0,
        monthly_value: data.monthly_value || null,
        start_date: data.start_date || getCurrentDate(),
        end_date: data.end_date || addYears(getCurrentDate(), 1),
        status: 'active',
        contract_type: data.contract_type || 'maintenance',
        duration_months: data.duration_months || null,

        // NOTA: Dados de equipamento salvos APENAS na tabela equipment (ver abaixo)
        // Campos equipment_* deprecados - usar tabela equipment dedicada

        // DADOS DO EQUIPAMENTO (mantidos por compatibilidade com telas atuais)
        equipment_type: safeString(data.equipment_type) || null,
        equipment_model: safeString(data.equipment_model) || null,
        equipment_brand: safeString(data.equipment_brand) || null,
        equipment_serial: safeString(data.equipment_serial) || null,
        equipment_power: safeString(data.equipment_power) || null,
        equipment_voltage: safeString(data.equipment_voltage) || null,
        equipment_location: safeString(data.equipment_location) || null,
        equipment_year: safeString(data.equipment_year) || null,
        equipment_condition: safeString(data.equipment_condition) || null,

        // SERVIÇOS E OBSERVAÇÕES
        services: normalizedServices,
        observations: normalizedObservations,
        payment_terms: normalizedPaymentTerms,
        technical_notes: normalizedTechnicalNotes,
        special_conditions: normalizedSpecialConditions,
        warranty_terms: normalizedWarrantyTerms,

        // Manter descrição apenas com observações do documento; campos comerciais ficam nos seus próprios campos
        description: normalizedObservations
      };
      
      console.log('📋 Criando contrato com dados:', contractData);
      console.log('📝 Texto extraído incluído:', contractData.extracted_text ? `${contractData.extracted_text.length} caracteres` : 'VAZIO');
      console.log('📊 Metadata de extração:', contractData.extraction_metadata);
      console.log('🔑 Client ID usado:', clientId);
      console.log('📄 Número do contrato final:', uniqueContractNumber);
      console.log('👤 [VERIFICAÇÃO CRÍTICA] Campos client_* que serão salvos no contrato:', {
        client_name: contractData.client_name,
        client_legal_name: contractData.client_legal_name,
        client_cnpj: contractData.client_cnpj,
        client_email: contractData.client_email,
        client_phone: contractData.client_phone,
        client_address: contractData.client_address,
        client_city: contractData.client_city,
        client_state: contractData.client_state,
        client_zip_code: contractData.client_zip_code,
        client_contact_person: contractData.client_contact_person
      });
      
      let newContract = null;
      let contractError = null;
      let retryAttempt = 0;
      const maxRetries = 3;

      while (retryAttempt < maxRetries && !newContract) {
        try {
          const result = await supabase
            .from('contracts')
            .insert(contractData)
            .select()
            .single();

          newContract = result.data;
          contractError = result.error;

          if (contractError) {
            console.error(`Erro ao criar contrato (tentativa ${retryAttempt + 1}):`, contractError);
            
            // Se for erro de UNIQUE constraint, gerar novo número e tentar novamente
            if (contractError.code === '23505' && contractError.message?.includes('contract_number')) {
              console.log('🔄 Erro de número duplicado detectado, gerando novo número...');
              const fallbackNumber = generateUniqueContractNumber();
              contractData.contract_number = fallbackNumber;
              console.log(`🆕 Tentando com novo número: ${fallbackNumber}`);
              retryAttempt++;
              continue;
            }
            
            // Se for outro tipo de erro de unique constraint
            if (contractError.code === '23505') {
              console.log('🔄 Erro de constraint única detectado, ajustando dados...');
              // Adicionar timestamp aos dados para torná-los únicos
              const timestamp = Date.now();
              if (contractData.client_name) {
                contractData.client_name = `${contractData.client_name} (${timestamp})`;
              }
              retryAttempt++;
              continue;
            }

            // Se não for erro de constraint única, parar as tentativas
            break;
          }
        } catch (error) {
          console.error('Erro inesperado na criação do contrato:', error);
          contractError = error;
          break;
        }
      }

      if (contractError || !newContract) {
        console.error('❌ Falha definitiva ao criar contrato:', contractError);
        throw contractError || new Error('Falha ao criar contrato após tentativas');
      }
      
      console.log('Contrato criado com sucesso:', newContract);

      // Criar equipamento se houver dados detalhados
      if (data.equipment_type || data.equipment_model || data.equipment_serial) {
        const equipmentData = {
          user_id: user?.id,
          contract_id: newContract.id,
          type: safeString(data.equipment_type) || 'Gerador',
          model: safeString(data.equipment_model) || null,
          serial_number: safeString(data.equipment_serial) || null,
          location: safeString(data.equipment_location) || null,
          manufacturer: safeString(data.equipment_brand) || null, // Usando brand como manufacturer
          year: safeString(data.equipment_year) || null, // ✅ Campo year dedicado
          condition: safeString(data.equipment_condition) || null, // ✅ Campo condition dedicado
          power: safeString(data.equipment_power) || null, // ✅ Campo power dedicado
          voltage: safeString(data.equipment_voltage) || null, // ✅ Campo voltage dedicado
          observations: null, // Observações adicionais podem ser adicionadas depois se necessário
          quantity: 1
        };
        
        console.log('Criando equipamento:', equipmentData);
        
        const { data: newEquipment, error: equipError } = await supabase
          .from('equipment')
          .insert(equipmentData)
          .select()
          .single();
          
        if (equipError) {
          console.error('Erro ao criar equipamento:', equipError);
          // Não falhar o processo todo por causa do equipamento
        } else {
          console.log('Equipamento criado:', newEquipment);
        }
      }

      // Gerar manutenções baseadas nos dados reais do contrato
      console.log('🔧 Dados extraídos para geração de manutenções:', data);
      
      const maintenanceResult = await generateMaintenances({
        contractId: newContract.id,
        startDate: newContract.start_date,
        endDate: newContract.end_date,
        frequency: 'monthly', // Será sobrescrito pelo plano de manutenção da IA
        contractType: newContract.contract_type,
        maintenancePlan: null, // Dados do plano da IA
        services: extractedData?.services || data.services || [],
        equipmentType: data.equipment_type || 'Gerador',
        userId
      });

      const generatedDocuments: string[] = [];
      const failedAgents: string[] = [];

      // Implementar geração de documentos com os agentes selecionados
      if (selectedAgents.size > 0) {
        console.log('📄 Iniciando geração de documentos com agentes:', Array.from(selectedAgents));
        setProcessingStatus('Gerando documentos dos agentes selecionados...');

        try {
          // Metadata removido - não existe na tabela contracts

          // Gerar documentos para cada agente selecionado
          const apiUrl = getApiUrl('/api/generate-document');
          const agentsArray = Array.from(selectedAgents);

          // Processar cada agente individualmente
          for (let i = 0; i < agentsArray.length; i++) {
            const agentType = agentsArray[i];
            setProcessingStatus(`Gerando documento ${i + 1}/${agentsArray.length}: ${agentType}...`);

            try {
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  agent_type: agentType,
                  contract_data: newContract
                })
              });

              if (response.ok) {
                const result = await response.json();
                console.log(`✅ Resposta da API para ${agentType}:`, result);

                if (result.success && result.content) {
                  // Salvar documento no banco usando tabela generated_reports
                  const agentNames: Record<string, string> = {
                    'manutencao': 'Plano de Manutenção',
                    'documentacao': 'Documentação Técnica',
                    'cronogramas': 'Cronogramas Integrados',
                    'relatorios': 'Relatórios e Análises'
                  };

                  // Garantir que temos um user_id válido (do contrato ou do auth)
                  const userId = user?.id || newContract.user_id;

                  if (!userId) {
                    console.error(`❌ Não foi possível obter user_id para salvar documento ${agentType}`);
                    failedAgents.push(agentType);
                    continue;
                  }

                  console.log(`💾 Salvando documento ${agentType} com user_id:`, userId);

                  const { error: saveError } = await supabase
                    .from('generated_reports')
                    .insert({
                      title: agentNames[agentType] || agentType,
                      content: result.content,
                      description: `Documento gerado pelo agente ${agentType}`,
                      user_id: userId
                    });

                  if (!saveError) {
                    generatedDocuments.push(agentType);
                    console.log(`✅ Documento ${agentType} salvo com sucesso na tabela generated_reports`);
                  } else {
                    console.error(`❌ Erro ao salvar documento ${agentType}:`, saveError);
                    failedAgents.push(agentType);
                  }
                } else {
                  console.error(`❌ Resposta inválida da API para ${agentType}:`, result);
                  failedAgents.push(agentType);
                }
              } else {
                const errorText = await response.text();
                console.error(`❌ Erro ao gerar documento ${agentType}. Status: ${response.status}, Response:`, errorText);
                failedAgents.push(agentType);
              }
            } catch (error) {
              console.error(`❌ Erro ao processar agente ${agentType}:`, error);
              failedAgents.push(agentType);
            }
          }
          
          // Metadata removido - não existe na tabela contracts

          // Mostrar resultado ao usuário
          if (generatedDocuments.length > 0) {
            console.log(`✅ ${generatedDocuments.length} documentos gerados com sucesso`);
            if (failedAgents.length > 0) {
              console.warn(`⚠️ ${failedAgents.length} documentos falharam:`, failedAgents);
            }
          }
        } catch (error) {
          console.error('❌ Erro no processo de geração de relatórios:', error);
          toast({
            title: "Aviso",
            description: "Contrato criado, mas houve erro na geração de relatórios. Você pode tentar gerar depois.",
            variant: "destructive"
          });
        }
      }

      // Salvar o PDF original do contrato como documento
      if (fileName && fileSize) {
        try {
          console.log('📄 Salvando PDF do contrato original como documento...');

          // O arquivo foi enviado para contracts/temp/timestamp-filename.pdf
          // Precisamos usar esse caminho real, não construir um novo
          // fileName já contém o caminho completo do storage
          const pdfFilePath = fileName; // Já é o caminho correto: contracts/temp/...

          const pdfMetadata = {
            category: 'original', // Padronizado como 'original'
            original_name: fileName.split('/').pop() || fileName, // Apenas o nome do arquivo
            uploaded_at: new Date().toISOString()
          };

          console.log('💾 Salvando documento no banco de dados:', {
            contract_id: newContract.id,
            file_path: pdfFilePath,
            name: fileName.split('/').pop() || fileName,
            file_size: fileSize,
            metadata: pdfMetadata
          });

          const { error: pdfDocError } = await supabase
            .from('contract_documents')
            .insert({
              contract_id: newContract.id,
              file_path: pdfFilePath, // Caminho real do arquivo no storage
              name: fileName.split('/').pop() || fileName, // Apenas o nome
              file_type: 'application/pdf',
              file_size: fileSize,
              description: 'Documento original do contrato',
              metadata: pdfMetadata,
              user_id: userId
            });

          if (pdfDocError) {
            console.error('❌ Erro ao salvar PDF como documento:', pdfDocError);
            console.error('📄 Dados que tentamos inserir:', {
              contract_id: newContract.id,
              document_name: `Contrato Original - ${fileName}`,
              document_type: 'application/pdf',
              storage_path: '',
              file_size: fileSize,
              metadata: pdfMetadata,
              uploaded_by: userId
            });
          } else {
            console.log('✅ PDF do contrato salvo como documento');
          }
        } catch (error) {
          console.error('❌ Erro ao processar PDF como documento:', error);
        }
      }

      setProcessingStatus('Contrato criado com sucesso!');

      // Preparar mensagem de sucesso com informações sobre documentos gerados
      let successMessage = maintenanceResult.success
        ? `Contrato criado com ${maintenanceResult.count} manutenções programadas`
        : "Contrato criado com sucesso";

      if (selectedAgents.size > 0) {
        // As variáveis generatedDocuments e failedAgents já estão disponíveis no escopo
        const generatedDocs = generatedDocuments || [];
        const failedDocs = failedAgents || [];

        if (generatedDocs.length > 0) {
          successMessage += `. ${generatedDocs.length} documento(s) gerado(s) automaticamente`;
          if (failedDocs.length > 0) {
            successMessage += ` (${failedDocs.length} falhou)`;
          }
        }
      }

      toast({
        title: "Sucesso!",
        description: successMessage,
      });

      // Liberar interface
      setIsProcessing(false);
      setIsLocked(false);

      // Notificar parent component (isso vai recarregar a lista de contratos)
      if (onContractCreated) {
        onContractCreated(newContract);
      }

      // Fechar modal e limpar
      onClose();
      resetForm();

      // NÃO navegar - o modal deve fechar e a lista de contratos será atualizada automaticamente

    } catch (error) {
      console.error('Erro ao salvar:', error);
      setHasSavedContract(false);
      toast({
        title: "Erro ao salvar",
        description: (error && typeof error === 'object' && 'message' in error) ? (error as Error).message : "Erro ao salvar contrato",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsLocked(false); // Destravar interface
    }
  };

  // Função para salvar dados editados
  const handleSaveEditedData = () => {
    if (!editedData) return;

    // Usar os serviços que já estão no editedData (array) em vez do servicesInput (string)
    const currentServices = Array.isArray(editedData.services) ? editedData.services : [];
    
    const updatedData: ExtractedData = {
      ...editedData,
      services: currentServices
    };

    setEditedData(updatedData);
    setExtractedData(updatedData);
    setServicesInput(''); // Manter vazio para modo de edição
    setIsEditingData(false);
    
    toast({
      title: "Dados atualizados",
      description: "As alterações foram aplicadas. Clique em 'Confirmar e Salvar' para finalizar.",
    });
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedAgents(new Set());
    setExtractedData(null);
    setEditedData(null);
    setServicesInput('');
    setGeneratedDocuments(new Map());
    setUploadProgress(0);
    setExtractionProgress(0);
    setProcessingStatus('');
    setIsEditingData(false);
    setExistingClient(null);
    setClientChoice(null);
    setIsProcessing(false);
    setIsLocked(false);
    setHasSavedContract(false);
  };

  // Função duplicada removida - usar a definição anterior

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(newOpen) => {
          // Bloquear fechamento durante processamento
          if (!isLocked && newOpen === false) {
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Overlay bloqueador durante processamento - só durante processamento real */}
          {isProcessing && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
              <div className="bg-background p-8 rounded-lg shadow-2xl max-w-md w-full mx-4 border-2 border-primary/20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Processando Contrato
                  </h2>
                  <p className="text-center text-muted-foreground">
                    <strong>Aguarde!</strong> 
                    Estamos processando o contrato. Esta janela está bloqueada até a conclusão.
                  </p>
                  <div className="w-full space-y-2">
                    <Progress value={uploadProgress || extractionProgress || 0} className="w-full h-3" />
                    <p className="text-sm text-center font-medium text-primary">
                      {processingStatus || 'Processando...'}
                    </p>
                  </div>
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Não feche ou atualize esta página durante o processamento
                    </AlertDescription>
                  </Alert>

                </div>
              </div>
            </div>
          )}
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Upload Inteligente com IA
            </DialogTitle>
            <DialogDescription>
              Extraia automaticamente todos os dados do contrato e organize na pasta correta do cliente
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-1">
            {/* Upload Section */}
            {!extractedData && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>1. Selecione o arquivo PDF</CardTitle>
                    <CardDescription>
                      O sistema extrairá automaticamente todas as informações do contrato
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        disabled={isProcessing}
                      />
                      <label
                        htmlFor="file-upload"
                        className={isProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                      >
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600">
                          {selectedFile ? (
                            <span className="text-primary font-medium">
                              {selectedFile.name}
                            </span>
                          ) : (
                            <>
                              Clique para selecionar ou arraste um arquivo PDF
                            </>
                          )}
                        </p>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>2. Escolha os agentes especializados (opcional)</CardTitle>
                    <CardDescription>
                      Selecione um ou mais agentes para gerar relatórios e documentação adicional automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(agents).map(([key, agent]) => (
                        <div
                          key={key}
                          onClick={() => {
                            if (isProcessing) return; // Block changes during processing
                            const newSelection = new Set(selectedAgents);
                            if (newSelection.has(key)) {
                              newSelection.delete(key);
                            } else {
                              newSelection.add(key);
                            }
                            setSelectedAgents(newSelection);
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isProcessing 
                              ? 'cursor-not-allowed opacity-50' 
                              : 'cursor-pointer'
                          } ${
                            selectedAgents.has(key)
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${agent.color} text-white`}>
                              {agent.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{agent.name}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                {agent.description}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={selectedAgents.has(key)}
                                onChange={() => {}}
                                className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Select All / Clear All buttons */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAgents(new Set(Object.keys(agents)))}
                        disabled={selectedAgents.size === Object.keys(agents).length || isProcessing}
                      >
                        Selecionar Todos
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {selectedAgents.size} agente{selectedAgents.size !== 1 ? 's' : ''} selecionado{selectedAgents.size !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAgents(new Set())}
                        disabled={selectedAgents.size === 0 || isProcessing}
                      >
                        Limpar Seleção
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Process Button */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleProcessFile}
                    disabled={!selectedFile || isProcessing}
                    className="min-w-[150px]"
                  >
                    {isProcessing ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Processar com IA
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress Section com animação melhorada */}
                {isProcessing && (
                  <Card id="processing-section" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Animação de processamento */}
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-pulse"></div>
                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Upload do arquivo</span>
                            <span className="font-semibold text-primary">{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-3 bg-primary/10" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Análise IA</span>
                            <span className="font-semibold text-primary">{extractionProgress}%</span>
                          </div>
                          <Progress value={extractionProgress} className="h-3 bg-primary/10" />
                        </div>

                        {processingStatus && (
                          <div className="bg-primary/5 rounded-lg p-3 animate-in fade-in duration-300">
                            <div className="text-sm text-center font-medium text-primary flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              {processingStatus}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Extracted Data Display */}
            {extractedData && !isEditingData && (
              <div className="space-y-6">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <CheckCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Confira os dados e confirme. Se necessário, clique em "Editar Dados" para fazer alterações.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Dados Extraídos do Contrato</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Initialize editedData with current extractedData to ensure fresh values
                          setEditedData({ ...extractedData });
                          setIsEditingData(true);
                        }}
                        disabled={isProcessing}
                      >
                        Editar Dados
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="contract" className="w-full">
                      <TabsList className={`grid w-full grid-cols-4 ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}>
                        <TabsTrigger value="contract" disabled={isProcessing}>Contrato</TabsTrigger>
                        <TabsTrigger value="client" disabled={isProcessing}>Cliente</TabsTrigger>
                        <TabsTrigger value="equipment" disabled={isProcessing}>Equipamento</TabsTrigger>
                        <TabsTrigger value="observations" disabled={isProcessing}>Observações</TabsTrigger>
                      </TabsList>

                      <TabsContent value="contract" className="space-y-6 mt-4">
                        {/* Informações Básicas do Contrato */}
                        <Card className="border-l-4 border-l-green-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="w-5 h-5 text-green-500" />
                              Informações do Contrato
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Número do Contrato</Label>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-semibold text-lg">{extractedData.contract_number || 'Não identificado'}</p>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</Label>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <p className="font-semibold text-lg text-green-600">
                                    R$ {(extractedData.contract_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data de Início</Label>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-medium">{formatDateSafely(extractedData.start_date)}</p>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data de Término</Label>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-medium">{formatDateSafely(extractedData.end_date)}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Serviços e Condições */}
                        {(servicesToArray(extractedData?.services).length > 0 || extractedData.payment_terms) && (
                          <Card className="border-l-4 border-l-purple-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Settings className="w-5 h-5 text-purple-500" />
                                Serviços e Condições
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {(() => {
                                // Se services já é um array, usar diretamente; senão converter de texto
                                const servicesList = Array.isArray(extractedData?.services) 
                                  ? extractedData.services 
                                  : servicesToArray(extractedData?.services);
                                if (servicesList.length === 0) return null;
                                return (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Serviços Incluídos</Label>
                                    <div className="flex flex-wrap gap-2">
                                      {servicesList.map((service, index) => (
                                        <Badge key={`${service}-${index}`} variant="secondary" className="px-3 py-1">
                                          {service}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {extractedData.payment_terms && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Condições de Pagamento</Label>
                                  <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-md">{extractedData.payment_terms}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="client" className="space-y-6 mt-4">
                        {/* Alerta: Cliente não identificado */}
                        {extractedData.client_needs_review && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>⚠️ Cliente não identificado</AlertTitle>
                            <AlertDescription>
                              O sistema não conseguiu identificar o cliente automaticamente no PDF.
                              Por favor, clique em "Editar Dados" para preencher as informações do cliente manualmente antes de confirmar.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Dados da Empresa */}
                        <Card className="border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-primary" />
                              Dados da Empresa
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Razão Social</Label>
                                <p className="font-semibold text-lg">{extractedData.client_name}</p>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ</Label>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-semibold text-lg">{extractedData.client_cnpj}</p>
                                </div>
                              </div>
                            </div>

                            {extractedData.client_address && (
                              <div className="space-y-1.5 pt-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endereço Completo</Label>
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                  <div className="font-medium text-base">
                                    <p>
                                      {extractedData.client_address}
                                      {extractedData.client_number && `, ${extractedData.client_number}`}
                                      {extractedData.client_neighborhood && ` - ${extractedData.client_neighborhood}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {extractedData.client_city && `${extractedData.client_city}`}
                                      {extractedData.client_state && `/${extractedData.client_state}`}
                                      {extractedData.client_zip_code && ` - CEP: ${extractedData.client_zip_code}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Dados do Responsável */}
                        {(extractedData.client_contact_person || extractedData.client_email || extractedData.client_phone) && (
                          <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-500" />
                                Responsável pelo Contrato
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {extractedData.client_contact_person && (
                                  <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome Completo</Label>
                                    <p className="font-semibold text-lg">{extractedData.client_contact_person}</p>
                                  </div>
                                )}

                                {extractedData.client_email && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">E-mail</Label>
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-muted-foreground" />
                                      <p className="font-medium">{extractedData.client_email}</p>
                                    </div>
                                  </div>
                                )}

                                {extractedData.client_phone && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</Label>
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-muted-foreground" />
                                      <p className="font-medium">{extractedData.client_phone}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="equipment" className="space-y-6 mt-4">
                        {/* Informações do Equipamento */}
                        <Card className="border-l-4 border-l-orange-500">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Wrench className="w-5 h-5 text-orange-500" />
                              Especificações do Equipamento
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {extractedData.equipment_type && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</Label>
                                  <p className="font-semibold text-lg">{safeString(extractedData.equipment_type)}</p>
                                </div>
                              )}
                              {extractedData.equipment_model && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Modelo</Label>
                                  <p className="font-medium">{safeString(extractedData.equipment_model)}</p>
                                </div>
                              )}
                              {extractedData.equipment_brand && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Marca</Label>
                                  <p className="font-medium">{safeString(extractedData.equipment_brand)}</p>
                                </div>
                              )}
                              {extractedData.equipment_serial && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Número de Série</Label>
                                  <p className="font-medium font-mono text-sm">{safeString(extractedData.equipment_serial)}</p>
                                </div>
                              )}
                              {extractedData.equipment_power && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Potência</Label>
                                  <p className="font-medium">{safeString(extractedData.equipment_power)}</p>
                                </div>
                              )}
                              {extractedData.equipment_voltage && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tensão</Label>
                                  <p className="font-medium">{safeString(extractedData.equipment_voltage)}</p>
                                </div>
                              )}
                              {extractedData.equipment_year && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ano de Fabricação</Label>
                                  <p className="font-medium">{safeString(extractedData.equipment_year)}</p>
                                </div>
                              )}
                              {extractedData.equipment_condition && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Condição</Label>
                                  <Badge variant={safeString(extractedData.equipment_condition).toLowerCase().includes('novo') ? 'default' : 'secondary'} className="w-fit">
                                    {safeString(extractedData.equipment_condition)}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Localização do Equipamento */}
                        {extractedData.equipment_location && (
                          <Card className="border-l-4 border-l-cyan-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-cyan-500" />
                                Localização
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="font-medium">{safeString(extractedData.equipment_location)}</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      <TabsContent value="observations" className="space-y-6 mt-4">
                        {extractedData.observations && (
                          <Card className="border-l-4 border-l-amber-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Observações Gerais
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                {extractedData.observations}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {extractedData.technical_notes && (
                          <Card className="border-l-4 border-l-indigo-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-500" />
                                Notas Técnicas
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                {extractedData.technical_notes}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {extractedData.special_conditions && (
                          <Card className="border-l-4 border-l-pink-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Settings className="w-5 h-5 text-pink-500" />
                                Condições Especiais
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                {extractedData.special_conditions}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {extractedData.warranty_terms && (
                          <Card className="border-l-4 border-l-teal-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-teal-500" />
                                Termos de Garantia
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                {extractedData.warranty_terms}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {clientChoice === 'existing' && existingClient && (
                      <>
                        <FolderOpen className="w-4 h-4" />
                        <span>Será adicionado à pasta de {existingClient.name}</span>
                      </>
                    )}
                    {clientChoice === 'new' && (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Nova pasta será criada</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isProcessing}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmAndSave}
                      disabled={isProcessing}
                      className="min-w-[150px]"
                    >
                      {isProcessing ? 'Salvando...' : 'Confirmar e Salvar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode - unified editor */}
            {isEditingData && editedData && (
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Edite os dados extraídos conforme necessário
                  </AlertDescription>
                </Alert>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 md:pr-4">
                  <ContractEditor
                    mode="create"
                    value={{
                      contract_number: editedData.contract_number,
                      value: editedData.contract_value,
                      monthly_value: editedData.monthly_value,
                      duration_months: editedData.duration_months,
                      start_date: editedData.start_date,
                      end_date: editedData.end_date,
                      contract_type: editedData.contract_type,
                      client_name: editedData.client_name,
                      client_legal_name: editedData.client_legal_name,
                      client_cnpj: editedData.client_cnpj,
                      client_email: editedData.client_email,
                      client_phone: editedData.client_phone,
                      client_address: editedData.client_address,
                      client_neighborhood: editedData.client_neighborhood,
                      client_number: editedData.client_number,
                      client_city: editedData.client_city,
                      client_state: editedData.client_state,
                      client_zip_code: editedData.client_zip_code,
                      client_contact_person: editedData.client_contact_person,
                      equipment_type: editedData.equipment_type,
                      equipment_model: editedData.equipment_model,
                      equipment_brand: editedData.equipment_brand,
                      equipment_serial: editedData.equipment_serial,
                      equipment_power: editedData.equipment_power,
                      equipment_voltage: editedData.equipment_voltage,
                      equipment_year: editedData.equipment_year,
                      equipment_condition: editedData.equipment_condition,
                      equipment_location: editedData.equipment_location,
                      observations: editedData.observations,
                      payment_terms: editedData.payment_terms,
                      technical_notes: editedData.technical_notes,
                      special_conditions: editedData.special_conditions,
                      warranty_terms: editedData.warranty_terms,
                      services: Array.isArray(editedData.services) ? editedData.services : []
                    }}
                    onChange={(patch) => setEditedData(prev => prev ? ({ ...prev, ...patch }) : (patch as any))}
                    servicesInput={servicesInput}
                    onServicesInputChange={setServicesInput}
                    onAddService={(text) => {
                      const current = Array.isArray(editedData.services) ? editedData.services : [];
                      setEditedData(prev => prev ? ({ ...prev, services: [...current, text] }) : prev);
                                          setServicesInput('');
                    }}
                    onRemoveService={(index) => {
                      const current = Array.isArray(editedData.services) ? editedData.services : [];
                      setEditedData(prev => prev ? ({ ...prev, services: current.filter((_, i) => i !== index) }) : prev);
                    }}
                                  />
                                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setIsEditingData(false); setEditedData(extractedData); setServicesInput(''); }}>Cancelar</Button>
                  <Button onClick={handleSaveEditedData}>Salvar Alterações</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Choice Dialog */}
      <Dialog 
        open={showClientDialog} 
        onOpenChange={(newOpen) => {
          // Bloquear fechamento durante processamento
          if (!isLocked) {
            setShowClientDialog(newOpen);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Cliente Existente Encontrado
            </DialogTitle>
            <DialogDescription>
              Encontramos um cliente com dados similares em sua base de dados. 
              Deseja adicionar este contrato à pasta existente ou criar uma nova pasta?
            </DialogDescription>
          </DialogHeader>

          {existingClient && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{existingClient.name}</span>
                  </div>
                  {existingClient.cnpj && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">CNPJ: {existingClient.cnpj}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {existingClient.contracts_count} contrato(s) existente(s)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleClientChoice('new')}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Nova Pasta
            </Button>
            <Button
              onClick={() => handleClientChoice('existing')}
              className="flex-1"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Usar Pasta Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IntegratedUploadWithAgentsEnhanced;
