import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/config/api.config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, Settings, Clock, BarChart3, Download, Eye, Plus, CheckCircle, AlertCircle, Trash2, FileType, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditableDocumentTable from './EditableDocumentTable';
import { useAgentDocuments } from '@/hooks/useAgentDocuments';
import { PDFPreviewDialog } from './PDFPreviewDialog';

interface ContractDocumentsWithAgentsProps {
  contractId: string;
}

const ContractDocumentsWithAgents: React.FC<ContractDocumentsWithAgentsProps> = ({ contractId }) => {
  const { toast } = useToast();
  const { loadDocuments } = useAgentDocuments({ contractId, autoLoad: true });

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<unknown>(null);
  const [contractData, setContractData] = useState<unknown>(null);
  const [localDocuments, setLocalDocuments] = useState<unknown[]>([]);
  const [localDocumentsLoading, setLocalDocumentsLoading] = useState(false);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState('');
  const [previewDocumentName, setPreviewDocumentName] = useState('');

  const agents = [
    {
      id: 'manutencao',
      name: 'Plano de Manutenção',
      icon: Settings,
      description: 'Gera plano completo de manutenção com cronograma detalhado',
      color: 'blue',
      status: 'available'
    },
    {
      id: 'documentacao',
      name: 'Documentação Técnica',
      icon: FileText,
      description: 'Cria memorial descritivo e especificações técnicas',
      color: 'green',
      status: 'available'
    },
    {
      id: 'cronogramas',
      name: 'Cronogramas Integrados',
      icon: Clock,
      description: 'Desenvolve cronogramas físico-financeiro, compras e desembolso',
      color: 'purple',
      status: 'available'
    },
    {
      id: 'relatorios',
      name: 'Relatórios e Análises',
      icon: BarChart3,
      description: 'Produz relatórios de progresso e análises detalhadas',
      color: 'orange',
      status: 'available'
    }
  ];

  useEffect(() => {
    loadContractData();
    loadLocalDocuments();
  }, [contractId]);

  const loadContractData = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContractData(data);
    } catch (error) {
      console.error('Error loading contract:', error);
    }
  };

  const loadLocalDocuments = async () => {
    if (!contractId) return;

    setLocalDocumentsLoading(true);
    try {
      // Buscar documentos de contract_documents
      const { data: contractDocs, error: contractDocsError } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (contractDocsError) throw contractDocsError;

      // Buscar documentos gerados (generated_reports)
      const { data: generatedDocs, error: generatedDocsError } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (generatedDocsError) throw generatedDocsError;

      // Deduplicar documentos por agente, mantendo apenas a versão mais recente
      const docsByAgent = new Map<string, unknown[]>();
      (generatedDocs || []).forEach((doc) => {
        const agentKey =
          doc.agent_type ||
          doc.metadata?.agent_type ||
          doc.metadata?.category ||
          doc.title ||
          doc.id;

        if (!docsByAgent.has(agentKey)) {
          docsByAgent.set(agentKey, []);
        }
        docsByAgent.get(agentKey)!.push(doc);
      });

      const idsToDelete: string[] = [];
      const dedupedGeneratedDocs: unknown[] = [];

      docsByAgent.forEach((docs) => {
        if (!docs.length) return;

        docs.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return bTime - aTime;
        });

        dedupedGeneratedDocs.push(docs[0]);
        if (docs.length > 1) {
          idsToDelete.push(
            ...docs.slice(1).map((duplicate) => duplicate.id).filter(Boolean)
          );
        }
      });

      if (idsToDelete.length) {
        const { error: cleanupError } = await supabase
          .from('generated_reports')
          .delete()
          .in('id', idsToDelete);

        if (cleanupError) {
          console.error('Error cleaning duplicate generated documents:', cleanupError);
        } else {
          console.log(`🧹 Removed ${idsToDelete.length} duplicate generated document(s)`);
        }
      }

      // Mesclar os dois arrays, transformando generated_reports para o formato esperado
      const mergedDocs = [
        ...(contractDocs || []),
        ...dedupedGeneratedDocs.map(doc => {
          const parsedMetadata = typeof doc.metadata === 'string'
            ? (() => {
                try {
                  return JSON.parse(doc.metadata);
                } catch (err) {
                  console.warn('Failed to parse generated report metadata', err);
                  return {};
                }
              })()
            : (doc.metadata || {});

          return {
            ...doc,
            file_name: doc.title,
            document_name: doc.title,
            name: doc.title,
            category: doc.agent_type,
            metadata: {
              ...parsedMetadata,
              category: doc.agent_type,
              source: 'generated_reports'
            }
          };
        })
      ];

      console.log('📄 Documentos carregados:', {
        contractDocs: contractDocs?.length || 0,
        generatedDocs: generatedDocs?.length || 0,
        total: mergedDocs.length
      });

      setLocalDocuments(mergedDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível carregar os documentos",
        variant: "destructive"
      });
    } finally {
      setLocalDocumentsLoading(false);
    }
  };

  const processWithAgent = async (agentId: string) => {
    setSelectedAgent(agentId);
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus('Iniciando processamento...');

    try {
      // Simular progresso visual
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Update status messages
      setTimeout(() => setProcessingStatus('Analisando contrato...'), 600);
      setTimeout(() => setProcessingStatus('Extraindo dados relevantes...'), 1200);
      setTimeout(() => setProcessingStatus('Aplicando inteligência artificial...'), 1800);
      setTimeout(() => setProcessingStatus('Gerando documento...'), 2400);

      // Get current user for saving the report
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Call backend to generate document
      const apiUrl = API_ENDPOINTS.generateDocument;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: agentId,
          user_id: currentUser?.id,
          contract_data: contractData
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar documento');
      }

      setProcessingProgress(100);
      setProcessingStatus('Finalizado!');

      // Garantir que os dados mais recentes estejam em memória
      await loadDocuments();
      await loadLocalDocuments();

      const agent = agents.find(a => a.id === agentId);

      toast({
        title: "Documento gerado com sucesso!",
        description: `${agent?.name} foi processado e salvo`,
      });

    } catch (error) {
      console.error('Error processing with agent:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Não foi possível processar o documento",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedAgent(null);
      setProcessingProgress(0);
    }
  };

  const viewDocument = (doc: unknown) => {
    // Se for documento gerado (de generated_reports), usa o campo content diretamente
    if (doc.metadata?.source === 'generated_reports' || doc.content) {
      setSelectedDocument({
        ...doc,
        isGeneratedReport: true,
        displayContent: doc.content
      });
    }
    // Se for o PDF original do contrato, mostrar em formato especial
    else if (doc.metadata?.category === 'contrato_original' || doc.document_type === 'application/pdf') {
      const extractedText = doc.content_extracted || '';
      setSelectedDocument({
        ...doc,
        isPdf: true,
        extractedText: extractedText
      });
    } else {
      setSelectedDocument(doc);
    }
    setShowDocumentViewer(true);
  };

  const generatePDF = async (doc: unknown) => {
    // Declare tempContainer outside try block for cleanup in finally
    let tempContainer: HTMLDivElement | null = null;

    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto o documento é processado",
      });

      const documentTitle = doc.name || doc.document_name || doc.file_name || 'documento';
      let htmlContent = doc.content || doc.description || '';

      if (!htmlContent) {
        toast({
          title: "Erro",
          description: "Conteúdo do documento não disponível",
          variant: "destructive"
        });
        return;
      }

      // Check if content is HTML
      const isHTML = typeof htmlContent === 'string' && (
        htmlContent.includes('<html') ||
        htmlContent.includes('<!DOCTYPE') ||
        htmlContent.includes('<body') ||
        htmlContent.includes('<table')
      );

      if (!isHTML) {
        // If not HTML, convert to simple HTML
        htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
    h1 { color: #2c3e50; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${documentTitle}</h1>
  <p>${htmlContent.replace(/\n/g, '<br>')}</p>
</body>
</html>`;
      }

      // Create a temporary container to render HTML
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '20px';

      // Create iframe to render HTML properly
      const iframe = document.createElement('iframe');
      iframe.style.width = '210mm';
      iframe.style.border = 'none';
      tempContainer.appendChild(iframe);
      document.body.appendChild(tempContainer);

      // Wait for iframe to be ready
      await new Promise((resolve) => {
        iframe.onload = resolve;
        iframe.srcdoc = htmlContent;
      });

      // Wait a bit more for styles to apply
      await new Promise(resolve => setTimeout(resolve, 1000));

      const iframeBody = iframe.contentDocument?.body;
      if (!iframeBody) {
        throw new Error('Não foi possível renderizar o conteúdo');
      }

      // Capture the rendered HTML as canvas
      const canvas = await html2canvas(iframeBody, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: iframeBody.scrollWidth,
        windowHeight: iframeBody.scrollHeight
      });

      // Clean up (safe removal - check if element still exists and is child of body)
      if (tempContainer && tempContainer.parentNode === document.body) {
        document.body.removeChild(tempContainer);
        tempContainer = null;
      }

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
      const filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;

      // Save PDF
      pdf.save(filename);

      toast({
        title: "PDF gerado com sucesso!",
        description: `Arquivo salvo como ${filename}`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    } finally {
      // Ensure cleanup even if error occurs - prevent memory leaks and DOM conflicts
      if (tempContainer && tempContainer.parentNode === document.body) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handlePreviewDocument = async (doc: unknown) => {
    // Verificar se é PDF baseado no file_path
    const isPDF = doc.file_path?.toLowerCase().endsWith('.pdf') ||
                  doc.name?.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
      toast({
        title: "Preview não disponível",
        description: "Apenas arquivos PDF podem ser visualizados. Use o botão de download para outros tipos de arquivo.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Gerar signed URL com validade de 1 hora
      const { data, error } = await supabase.storage
        .from('contract-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Não foi possível gerar URL de acesso');
      }

      setPreviewPDFUrl(data.signedUrl);
      setPreviewDocumentName(doc.name || doc.file_name || 'Documento');
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

  const handleDeleteDocument = async (doc: unknown) => {
    try {
      // Verificar de qual tabela deletar baseado no metadata.source
      const isGeneratedReport = doc.metadata?.source === 'generated_reports';
      const tableName = isGeneratedReport ? 'generated_reports' : 'contract_documents';

      console.log(`🗑️ Deletando documento de ${tableName}:`, doc.id);

      // Delete from database
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', doc.id);

      if (error) {
        throw error;
      }

      // Reload documents to reflect changes
      await loadLocalDocuments();

      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o documento",
        variant: "destructive"
      });
    }
  };

  const getAgentIcon = (doc: unknown) => {
    // Special case for PDF contracts - filtramos 'original' para não aparecer aqui
    const isPdfContract = doc.document_type === 'application/pdf' && doc.metadata?.category === 'original';

    if (isPdfContract) {
      return <FileType className="h-4 w-4" />;
    }

    // For agent-generated documents, use category field
    const agentId = doc.category || doc.metadata?.category;
    const agent = agents.find(a => a.id === agentId);
    const Icon = agent?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getAgentColor = (agentId: string) => {
    // Special case for PDF contracts
    if (agentId === 'contrato_original') {
      return 'red';
    }

    const agent = agents.find(a => a.id === agentId);
    return agent?.color || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Agents Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Agentes Especializados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const hasDocument = localDocuments.some(d => d.category === agent.id);

            return (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${agent.color}-100 text-${agent.color}-600`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {agent.description}
                        </CardDescription>
                      </div>
                    </div>
                    {hasDocument && (
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Gerado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => processWithAgent(agent.id)}
                    disabled={isProcessing}
                    variant={hasDocument ? "outline" : "default"}
                    className="w-full"
                  >
                    {isProcessing && selectedAgent === agent.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : hasDocument ? (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Gerar Novo
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Gerar Documento
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processando com IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={processingProgress} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {processingStatus}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de documentos gerados - exclui apenas PDF original que está na aba "Dados do Contrato" */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Documentos Gerados</h3>
        {localDocumentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : localDocuments.filter(doc =>
            doc.metadata?.category !== 'original' &&
            doc.metadata?.category !== 'contrato_original'
          ).length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum documento gerado ainda. Use os agentes acima para criar documentos.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {localDocuments
              .filter(doc =>
                doc.metadata?.category !== 'original' &&
                doc.metadata?.category !== 'contrato_original'
              )
              .map((doc) => (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${getAgentColor(doc.category || doc.metadata?.category)}-100`}>
                        {getAgentIcon(doc)}
                      </div>
                      <div>
                        <p className="font-medium">{doc.document_name || doc.file_name || doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(doc.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDocument(doc)}
                        title="Visualizar documento"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(doc.file_path?.toLowerCase().endsWith('.pdf') || doc.name?.toLowerCase().endsWith('.pdf')) && (
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
                        onClick={() => generatePDF(doc)}
                        title="Baixar PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Excluir documento"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o documento "{doc.file_name || doc.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDocument(doc)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.document_name || selectedDocument?.file_name || selectedDocument?.name}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <>
              {/* Special viewer for generated reports */}
              {selectedDocument.isGeneratedReport ? (
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Documento gerado automaticamente pelo agente de IA.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border bg-muted/30">
                    <div className="bg-white m-4 rounded-lg shadow-sm">
                      <div className="border-b px-6 py-4 bg-muted/40">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Resumo do Documento
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {contractData?.client_name ? `Cliente: ${contractData.client_name}` : 'Documento gerado automaticamente'}
                          </span>
                        </div>
                      </div>
                      <div className="document-viewer max-h-[600px] overflow-y-auto px-6 py-6 space-y-6">
                        <div
                          className="prose prose-neutral max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedDocument.displayContent || selectedDocument.content }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowDocumentViewer(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : selectedDocument.isPdf ? (
                <div className="space-y-4">
                  <Alert>
                    <FileType className="h-4 w-4" />
                    <AlertDescription>
                      Este é o contrato original em PDF que foi enviado ao sistema.
                      {selectedDocument.extractedText && (
                        <span> O texto completo foi extraído via OCR e está disponível abaixo.</span>
                      )}
                    </AlertDescription>
                  </Alert>

                  {selectedDocument.extractedText && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h3 className="font-semibold mb-2">Texto Extraído (OCR):</h3>
                      <div className="max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {selectedDocument.extractedText}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDocumentViewer(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Regular editable document table for agent-generated documents */
                <EditableDocumentTable
                  document={selectedDocument}
                  agentType={selectedDocument.category}
                  onSave={async (data) => {
                    // Update the document in database
                    const documentData = {
                      ...data,
                      generated_by: 'Manual Edit',
                      generated_at: new Date().toISOString(),
                      edited: true
                    };

                    const { error } = await supabase
                      .from('contract_documents')
                      .update({ description: JSON.stringify(documentData) })
                      .eq('id', selectedDocument.id);

                    if (!error) {
                      // Update local state - reload documents to reflect changes
                      await loadLocalDocuments();
                      toast({
                        title: "Documento salvo",
                        description: "As alterações foram salvas com sucesso"
                      });
                    } else {
                      toast({
                        title: "Erro ao salvar",
                        description: "Não foi possível salvar as alterações",
                        variant: "destructive"
                      });
                    }
                  }}
                  onCancel={() => setShowDocumentViewer(false)}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        isOpen={isPDFPreviewOpen}
        onClose={() => setIsPDFPreviewOpen(false)}
        pdfUrl={previewPDFUrl}
        documentName={previewDocumentName}
      />
    </div>
  );
};

export default ContractDocumentsWithAgents;
