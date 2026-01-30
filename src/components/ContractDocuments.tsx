import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Edit, Trash2, Plus, Eye, Sparkles, Loader2, AlertCircle, FileImage, FileSpreadsheet, FileVideo, File, FileAudio, Code, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVisionAI, VisionAnalysisType } from '@/hooks/useVisionAI';
import { useAuth } from '@/contexts/AuthContext';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { formatDateSafe } from '@/utils/formatters';
import { API_BASE_URL } from '@/config/api.config';

interface ContractDocument {
  id: string;
  contract_id: string;
  document_name: string;
  storage_path: string;
  document_type: string;
  file_size: number;
  content_extracted?: string;
  extracted_insights?: {
    summary?: string;
    document_type?: string;
    key_information?: {
      parties?: string[];
      dates?: { start?: string; end?: string; others?: string[] };
      values?: { total?: string; monthly?: string; others?: string[] };
      equipment?: string[];
      services?: string[];
    };
    highlights?: string[];
    technical_details?: string;
  };
  extraction_method?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'error';
  processing_error?: string;
  metadata: {
    description?: string;
    category?: string;
    uploaded_via?: string;
    original_name?: string;
  };
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

interface ContractDocumentsProps {
  contractId: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'Geral' },
  { value: 'contract', label: 'Contrato' },
  { value: 'technical', label: 'Técnico' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'compliance', label: 'Conformidade' },
  { value: 'image', label: 'Imagem' },
  { value: 'spreadsheet', label: 'Planilha' },
  { value: 'presentation', label: 'Apresentação' },
  { value: 'data', label: 'Dados/XML' },
  { value: 'other', label: 'Outros' }
];

const ContractDocuments = ({ contractId }: ContractDocumentsProps) => {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const { analyzeImages, isProcessing } = useVisionAI();
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState('');
  const [previewDocumentName, setPreviewDocumentName] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ContractDocument | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general'
  });

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível carregar os documentos do contrato.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractId, toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-detect category based on file type
  const detectFileCategory = (file: File): string => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Images
    if (fileType.startsWith('image/')) {
      return 'image';
    }
    
    // Spreadsheets
    if (fileType.includes('spreadsheet') || 
        fileType.includes('excel') ||
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')) {
      return 'spreadsheet';
    }
    
    // Presentations
    if (fileType.includes('presentation') ||
        fileName.endsWith('.ppt') ||
        fileName.endsWith('.pptx')) {
      return 'presentation';
    }
    
    // Data/XML files
    if (fileType.includes('xml') ||
        fileName.endsWith('.xml') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.csv')) {
      return 'data';
    }
    
    // Technical documents
    if (fileName.includes('manual') ||
        fileName.includes('especificacao') ||
        fileName.includes('tecnico') ||
        fileName.includes('spec')) {
      return 'technical';
    }
    
    // Financial documents
    if (fileName.includes('financeiro') ||
        fileName.includes('orcamento') ||
        fileName.includes('fatura') ||
        fileName.includes('nota') ||
        fileName.includes('pagamento')) {
      return 'financial';
    }
    
    // Maintenance documents
    if (fileName.includes('manutencao') ||
        fileName.includes('maintenance') ||
        fileName.includes('preventiva') ||
        fileName.includes('corretiva')) {
      return 'maintenance';
    }
    
    // Contract documents
    if (fileName.includes('contrato') ||
        fileName.includes('contract') ||
        fileName.includes('acordo')) {
      return 'contract';
    }
    
    // Default
    return 'general';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(file);
    setFormData(prev => ({
      ...prev,
      name: prev.name || file.name,
      category: detectFileCategory(file) // Auto-detect category
    }));
  };

  const handleUploadDocument = async () => {
    if (!uploadingFile || !formData.name) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e preencha o nome.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Use the new API endpoint for upload with AI processing
      const uploadFormData = new FormData();
      uploadFormData.append('file', uploadingFile);
      uploadFormData.append('name', formData.name);
      if (formData.description) uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);

      const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar documento');
      }

      const newDocument = await response.json();

      toast({
        title: "Documento enviado",
        description: "O documento foi adicionado e está sendo processado pela IA.",
      });

      // Add to list and start polling if processing
      setDocuments(prev => [newDocument, ...prev]);

      if (newDocument.processing_status === 'processing') {
        pollDocumentStatus(newDocument.id);
      }

      setIsUploadDialogOpen(false);
      setUploadingFile(null);
      setFormData({ name: '', description: '', category: 'general' });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar o documento.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Poll document status until processing is complete
  const pollDocumentStatus = useCallback(async (documentId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) return;

        const document = await response.json();

        // Update in list
        setDocuments(prev => prev.map(d =>
          d.id === documentId ? document : d
        ));

        // Update selected if same
        if (selectedDocument?.id === documentId) {
          setSelectedDocument(document);
        }

        if (document.processing_status === 'completed') {
          toast({
            title: "Processamento concluído",
            description: "Documento analisado pela IA com sucesso!",
          });
          return;
        }

        if (document.processing_status === 'error') {
          toast({
            title: "Erro no processamento",
            description: document.processing_error || "Erro ao processar documento",
            variant: "destructive"
          });
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling document status:', error);
      }
    };

    poll();
  }, [toast, selectedDocument]);

  // Reprocess document with AI
  const handleReprocessDocument = async (doc: ContractDocument) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${doc.id}/reprocess`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reprocessar');
      }

      toast({
        title: "Reprocessando",
        description: "Documento enviado para reprocessamento pela IA.",
      });

      // Update status and start polling
      setDocuments(prev => prev.map(d =>
        d.id === doc.id ? { ...d, processing_status: 'processing' as const } : d
      ));

      pollDocumentStatus(doc.id);
    } catch (error) {
      console.error('Error reprocessing document:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível reprocessar",
        variant: "destructive"
      });
    }
  };

  // Open details dialog
  const openDetailsDialog = (doc: ContractDocument) => {
    setSelectedDocument(doc);
    setIsDetailsDialogOpen(true);
  };

  // Convert PDF to image for vision processing
  const pdfToImage = async (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = reject;
      
      // For PDF files, we'll try to convert the first page
      // This is a simplified approach - in production you'd use a proper PDF library
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        img.src = URL.createObjectURL(blob);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleExtractWithAI = async (doc: ContractDocument) => {
    if (isProcessing) return;

    try {
      console.log('🚀 Iniciando extração com Vision AI para documento:', doc.document_name);

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .download(doc.storage_path);

      if (downloadError) {
        console.error('Erro no download do arquivo:', downloadError);
        throw new Error('Não foi possível baixar o arquivo do storage');
      }

      let imageDataUrl: string;

      // Convert file to base64 data URL
      if (doc.document_type === 'application/pdf') {
        // For PDFs, convert to image first
        try {
          imageDataUrl = await pdfToImage(fileData);
        } catch (error) {
          console.warn('Falha na conversão PDF para imagem, usando fallback');
          // Fallback: convert PDF bytes directly to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          imageDataUrl = `data:application/pdf;base64,${base64Data}`;
        }
      } else {
        // For images and other files
        const arrayBuffer = await fileData.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        imageDataUrl = `data:${doc.document_type};base64,${base64Data}`;
      }

      // Use Vision AI for document analysis
      const prompt = `Analise este documento de contrato e extraia as seguintes informações estruturadas:
      - Nome do cliente/empresa
      - CNPJ/CPF
      - Tipo de contrato
      - Valor do contrato
      - Data de início e término
      - Equipamentos mencionados
      - Frequência de manutenção
      - Observações importantes
      
      Retorne as informações de forma organizada e clara.`;

      const result = await analyzeImages(
        [imageDataUrl], 
        'document_ocr' as VisionAnalysisType, 
        prompt
      );

      if (result?.success) {
        console.log('✅ Dados extraídos com Vision AI:', result);

        // Save result to database
        const { error: saveError } = await supabase
          .from('ai_generated_plans')
          .insert({
            contract_id: contractId,
            plan_type: 'document_analysis',
            content: JSON.stringify({
              document_name: doc.document_name,
              analysis: result.analysis,
              analysis_type: result.analysisType,
              source: 'vision-ai',
              processed_at: new Date().toISOString()
            }),
            status: 'generated'
          });

        if (saveError) {
          console.warn('Erro ao salvar resultado:', saveError);
        }

        toast({
          title: "✅ Extração concluída!",
          description: "Documento processado com Vision AI. Dados extraídos com sucesso.",
        });
      } else {
        throw new Error('Falha na análise com Vision AI');
      }

    } catch (error) {
      console.error('❌ Erro na extração:', error);
      
      let errorMessage = 'Não foi possível extrair os dados automaticamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Erro na extração",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (doc: ContractDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o documento.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: ContractDocument) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso.",
      });

      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o documento.",
        variant: "destructive"
      });
    }
  };

  const handleEditDocument = async () => {
    if (!selectedDocument || !formData.name) return;

    try {
      const { error } = await supabase
        .from('contract_documents')
        .update({
          document_name: formData.name,
          metadata: {
            ...selectedDocument.metadata,
            description: formData.description,
            category: formData.category
          }
        })
        .eq('id', selectedDocument.id);

      if (error) throw error;

      toast({
        title: "Documento atualizado",
        description: "As informações do documento foram atualizadas.",
      });

      setIsEditDialogOpen(false);
      setSelectedDocument(null);
      setFormData({ name: '', description: '', category: 'general' });
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o documento.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (doc: ContractDocument) => {
    setSelectedDocument(doc);
    setFormData({
      name: doc.document_name,
      description: doc.metadata?.description || '',
      category: doc.metadata?.category || 'general'
    });
    setIsEditDialogOpen(true);
  };

  const handlePreviewDocument = async (doc: ContractDocument) => {
    // Só PDFs podem ser visualizados inline
    if (doc.document_type !== 'application/pdf') {
      toast({
        title: "Preview não disponível",
        description: "Apenas arquivos PDF podem ser visualizados. Use o botão de download para outros tipos de arquivo.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Gerar signed URL com validade de 1 hora para preview
      const { data, error } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storage_path, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Não foi possível gerar URL de acesso');
      }

      setPreviewPDFUrl(data.signedUrl);
      setPreviewDocumentName(doc.document_name);
      setIsPDFPreviewOpen(true);
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast({
        title: "Erro ao abrir preview",
        description: "Não foi possível carregar o documento.",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    return DOCUMENT_CATEGORIES.find(cat => cat.value === category)?.label || category;
  };

  // Get appropriate icon for file type
  const getFileIcon = (doc: ContractDocument) => {
    const fileType = doc.document_type.toLowerCase();
    const fileName = doc.document_name.toLowerCase();
    
    // Images
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-600" />;
    }
    
    // Spreadsheets
    if (fileType.includes('spreadsheet') || 
        fileType.includes('excel') ||
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    
    // Videos
    if (fileType.startsWith('video/')) {
      return <FileVideo className="h-8 w-8 text-purple-600" />;
    }
    
    // Audio
    if (fileType.startsWith('audio/')) {
      return <FileAudio className="h-8 w-8 text-red-600" />;
    }
    
    // Code/XML files
    if (fileType.includes('xml') ||
        fileName.endsWith('.xml') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.csv') ||
        fileName.endsWith('.js') ||
        fileName.endsWith('.ts') ||
        fileName.endsWith('.html') ||
        fileName.endsWith('.css')) {
      return <Code className="h-8 w-8 text-orange-600" />;
    }
    
    // PDF documents
    if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    
    // Word documents
    if (fileType.includes('word') || 
        fileName.endsWith('.doc') ||
        fileName.endsWith('.docx')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    
    // Default file icon
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documentos do Contrato</h3>
        <div className="flex items-center space-x-3">
          {/* Vision AI Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>Vision AI Ativo</span>
            </div>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Documento
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Sistema usando Vision AI para extração inteligente de dados. 
          Suporte para PDFs, imagens e documentos escaneados.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Adicione documentos relacionados a este contrato
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Documento
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {getFileIcon(doc)}
                    <div className="flex-1">
                      <h4 className="font-medium">{doc.document_name}</h4>
                      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <Badge variant="outline">{getCategoryLabel(doc.metadata?.category || 'general')}</Badge>
                        <span>{formatDateSafe(doc.created_at)}</span>
                        {/* Processing Status Badge */}
                        {doc.processing_status === 'processing' && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processando IA
                          </Badge>
                        )}
                        {doc.processing_status === 'completed' && doc.extracted_insights?.summary && (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <CheckCircle className="h-3 w-3" />
                            IA Analisado
                          </Badge>
                        )}
                        {doc.processing_status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Erro
                          </Badge>
                        )}
                        {doc.processing_status === 'pending' && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      {doc.metadata?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.metadata?.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {/* View AI Summary Button */}
                    {doc.extracted_insights?.summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDialog(doc)}
                        className="text-primary border-primary/20 hover:bg-primary/5"
                        title="Ver Resumo IA"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Resumo IA
                      </Button>
                    )}
                    {/* Reprocess Button for errors or pending */}
                    {(doc.processing_status === 'error' || (doc.processing_status === 'completed' && !doc.extracted_insights?.summary)) && doc.document_type === 'application/pdf' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprocessDocument(doc)}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        title="Reprocessar com IA"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {doc.document_type === 'application/pdf' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewDocument(doc)}
                        title="Visualizar PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(doc)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(doc)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileUpload}
                accept="*"
              />
              <p className="text-xs text-muted-foreground mt-1">
                📎 Aceita todos os tipos: PDF, DOC, DOCX, XLS, XLSX, CSV, XML, PNG, JPG, PPT, e outros
              </p>
              {uploadingFile && (
                <p className="text-sm text-green-600 mt-1 font-medium">
                  ✅ {uploadingFile.name} ({formatFileSize(uploadingFile.size)})
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Nome do Documento</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do documento"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do documento"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUploadDocument} disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Documento</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do documento"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do documento"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditDocument}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        isOpen={isPDFPreviewOpen}
        onClose={() => setIsPDFPreviewOpen(false)}
        pdfUrl={previewPDFUrl}
        documentName={previewDocumentName}
      />

      {/* AI Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.document_name || 'Documento'}
            </DialogTitle>
            <DialogDescription>
              Resumo gerado por IA do conteúdo do documento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Análise da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDocument?.processing_status === 'processing' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm font-medium">Processando documento...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A IA está analisando o conteúdo
                    </p>
                  </div>
                ) : selectedDocument?.processing_status === 'error' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mb-4" />
                    <p className="text-sm font-medium text-destructive">Erro no processamento</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedDocument.processing_error || 'Não foi possível processar o documento'}
                    </p>
                  </div>
                ) : selectedDocument?.extracted_insights?.summary ? (
                  <>
                    {/* Summary */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Resumo</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                        {selectedDocument.extracted_insights.summary}
                      </p>
                    </div>

                    {/* Document Type */}
                    {selectedDocument.extracted_insights.document_type && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 font-medium">Tipo de Documento</p>
                        <Badge variant="secondary">{selectedDocument.extracted_insights.document_type}</Badge>
                      </div>
                    )}

                    {/* Highlights */}
                    {selectedDocument.extracted_insights.highlights && selectedDocument.extracted_insights.highlights.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                          Pontos Importantes ({selectedDocument.extracted_insights.highlights.length})
                        </p>
                        <div className="space-y-2">
                          {selectedDocument.extracted_insights.highlights.map((highlight, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 text-sm p-3 bg-muted/30 rounded-lg"
                            >
                              <span className="text-primary font-bold">•</span>
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Information */}
                    {selectedDocument.extracted_insights.key_information && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 font-medium">Informações-Chave</p>
                        <div className="space-y-2 text-sm">
                          {selectedDocument.extracted_insights.key_information.parties && selectedDocument.extracted_insights.key_information.parties.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-muted-foreground">Partes:</span>
                              {selectedDocument.extracted_insights.key_information.parties.map((party, i) => (
                                <Badge key={i} variant="outline">{party}</Badge>
                              ))}
                            </div>
                          )}
                          {selectedDocument.extracted_insights.key_information.equipment && selectedDocument.extracted_insights.key_information.equipment.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-muted-foreground">Equipamentos:</span>
                              {selectedDocument.extracted_insights.key_information.equipment.map((eq, i) => (
                                <Badge key={i} variant="outline">{eq}</Badge>
                              ))}
                            </div>
                          )}
                          {selectedDocument.extracted_insights.key_information.values?.total && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Valor Total:</span>
                              <span className="font-medium">{selectedDocument.extracted_insights.key_information.values.total}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical Details */}
                    {selectedDocument.extracted_insights.technical_details && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 font-medium">Detalhes Técnicos</p>
                        <p className="text-sm bg-muted/30 rounded-lg p-3">
                          {selectedDocument.extracted_insights.technical_details}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Análise não disponível</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O documento ainda não foi processado pela IA
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractDocuments;
