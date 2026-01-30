import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVisionAI } from '@/hooks/useVisionAI';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDocumentIntelligence } from '@/hooks/useDocumentIntelligence';
import FileUpload from '@/components/FileUpload';
import AIVisionProcessor from '@/components/AIVisionProcessor';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Image,
  Brain,
  Download,
  Eye,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Upload,
  FileCheck,
  FileSearch,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Search,
  Zap,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProcessedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'text';
  content: string;
  rawContent?: string;
  analysis?: unknown;
  extractedText?: string;
  summary?: string;
  keyPoints?: string[];
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileSize?: number;
  preview?: string;
}

interface AnalysisResult {
  summary?: string;
  keyPoints?: string[];
  entities?: unknown[];
  sentiment?: string;
  customAnalysis?: string;
}

// Prompts pré-definidos para análise
const predefinedPrompts = [
  {
    label: 'Resumo Executivo',
    value: 'Faça um resumo executivo do documento, destacando os pontos principais e conclusões.',
    icon: FileSearch
  },
  {
    label: 'Extrair Informações de Contrato',
    value: 'Extraia as seguintes informações: partes envolvidas, data de início e término, valor total, obrigações de cada parte, cláusulas importantes.',
    icon: FileText
  },
  {
    label: 'Identificar Datas e Prazos',
    value: 'Liste todas as datas, prazos e cronogramas mencionados no documento.',
    icon: Clock
  },
  {
    label: 'Análise de Riscos',
    value: 'Identifique possíveis riscos, problemas ou cláusulas que requerem atenção especial.',
    icon: AlertCircle
  },
  {
    label: 'Pontos de Ação',
    value: 'Liste todos os pontos de ação, tarefas ou responsabilidades mencionadas no documento.',
    icon: CheckCircle
  }
];

const SmartDocumentReader = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<unknown[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { extractTextFromImage, isProcessing: isProcessingImage } = useVisionAI();
  const {
    isAnalyzing,
    retryCount,
    analyzeDocumentWithAI,
    extractTextFromPDF: extractPDFWithIntelligence,
    analyzeExtractedContent
  } = useDocumentIntelligence();

  // Calculate overall progress
  const calculateProgress = () => {
    if (uploadedFiles.length === 0) return 0;
    if (processedDocuments.length > 0 && selectedDocument) return 66;
    if (processedDocuments.length > 0) return 33;
    return 10;
  };

  const handleFileUpload = async (files: unknown[]) => {
    setUploadedFiles(prev => [...prev, ...files]);

    // Generate preview for first file
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes('pdf')) {
        // For PDFs, show loading message instead of base64
        setDocumentPreview('Processando PDF para visualização...');
        // Auto-process PDF to extract text for preview
        setTimeout(() => processDocumentForPreview(file), 100);
      } else if (file.type.includes('text')) {
        // For text files, show actual content
        if (file.content && !file.content.startsWith('data:')) {
          setDocumentPreview(file.content.substring(0, 500) + '...');
        }
      } else if (file.type.includes('image')) {
        // For images, use the data URL
        setDocumentPreview(file.content);
      }

      // Auto-process ALL uploaded files after upload
      setTimeout(() => {
        files.forEach((file, index) => {
          setTimeout(() => {
            processDocument(file);
          }, index * 1000); // Stagger processing by 1 second each
        });
      }, 500);
    }
    // Toast já é exibido pelo hook useFileUpload, removido duplicação
  };

  const processDocumentForPreview = async (file: unknown) => {
    try {
      if (file.type.includes('pdf')) {
        setDocumentPreview('Extraindo texto do PDF...');
        const extractedText = await extractTextFromPDF(file.content);
        if (extractedText && !extractedText.includes('Erro') && !extractedText.includes('Não foi possível')) {
          setDocumentPreview(extractedText.substring(0, 500) + '...');
        } else {
          setDocumentPreview('PDF carregado. Clique em "Processar" para extrair o texto completo.');
        }
      }
    } catch (error) {
      console.error('Error processing document for preview:', error);
      setDocumentPreview('PDF carregado. Clique em "Processar" para extrair o texto.');
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (uploadedFiles.length === 1) {
      setDocumentPreview('');
    }
  };

  const extractTextFromPDF = async (content: string): Promise<string> => {
    try {
      // Try multiple extraction methods, starting with backend API
      const methods = [
        {
          name: 'Backend Simple Extract',
          description: 'Extraindo via servidor backend...',
          extract: async () => {
            try {
              // Convert base64 to blob if needed
              const base64Data = content.split(',')[1] || content;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/pdf' });

              // Create FormData with the PDF file
              const formData = new FormData();
              formData.append('file', blob, 'document.pdf');

              // Call the new simple extract endpoint
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              const response = await fetch(`${apiUrl}/api/extract-text`, {
                method: 'POST',
                body: formData
              });

              if (!response.ok) throw new Error('API extraction failed');
              const data = await response.json();
              return data.text || '';
            } catch (err) {
              console.log('Backend Simple Extract failed:', err);
              throw err;
            }
          }
        },
        {
          name: 'Supabase Edge Function',
          description: 'Tentando extração via Supabase...',
          extract: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const { data, error } = await supabase.functions.invoke('process-pdf', {
                body: { content, extractText: true },
                headers: {
                  Authorization: `Bearer ${session?.access_token || ''}`
                }
              });
              if (error) throw error;
              return data?.text || '';
            } catch (err) {
              console.log('Supabase Edge Function failed:', err);
              throw err;
            }
          }
        },
        {
          name: 'Document Intelligence',
          description: 'Usando IA para extrair texto...',
          extract: async () => {
            try {
              // This might trigger the vision-processor error, so we try it last
              const result = await extractPDFWithIntelligence(content);
              return result || '';
            } catch (err) {
              console.log('Document Intelligence failed:', err);
              throw err;
            }
          }
        }
      ];

      let methodIndex = 0;
      for (const method of methods) {
        try {
          methodIndex++;
          setProcessingMessage(method.description);
          setProcessingProgress(10 + (methodIndex * 30));
          const text = await method.extract();
          if (text && text.length > 50) {
            setProcessingProgress(100);
            setProcessingMessage('Texto extraído com sucesso!');
            return text;
          }
        } catch (err) {
          // Continue to next method
        }
      }

      setProcessingMessage('Não foi possível extrair texto automaticamente');
      return 'Não foi possível extrair texto do PDF automaticamente. Por favor, tente copiar e colar o texto manualmente.';
    } catch (error) {
      console.error('Error extracting PDF:', error);
      setProcessingMessage('Erro ao processar PDF');
      return 'Erro na extração do PDF. Verifique se o PDF não está protegido ou corrompido.';
    } finally {
      // Clean up after 2 seconds
      setTimeout(() => {
        setProcessingMessage('');
      }, 2000);
    }
  };

  const organizeTextWithAI = async (rawText: string): Promise<string> => {
    try {
      setProcessingMessage('Organizando texto...');

      // Simple text formatting to clean up extraction artifacts
      const formattedText = rawText
        .replace(/\n{3,}/g, '\n\n') // Remove multiple blank lines
        .replace(/\s{2,}/g, ' ') // Remove multiple spaces
        .trim();

      return formattedText;
    } catch (error) {
      console.error('Error organizing text:', error);
      return rawText; // Return original text if fails
    }
  };

  const processDocument = async (file: unknown) => {
    setIsProcessingDocument(true);
    setProcessingProgress(0);
    const processedDoc: ProcessedDocument = {
      id: file.id,
      name: file.name,
      type: file.type.includes('image') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'text',
      content: '',
      rawContent: file.content,
      timestamp: new Date(),
      status: 'processing',
      fileSize: file.size,
      preview: file.content?.substring(0, 200)
    };

    setProcessedDocuments(prev => [...prev, processedDoc]);

    // Auto-switch to process tab
    setActiveTab('process');

    try {
      setProcessingProgress(5);
      setProcessingMessage('Iniciando processamento...');

      // Process based on file type
      if (file.type.includes('pdf')) {
        setProcessingProgress(10);
        setProcessingMessage('Preparando extração de PDF...');

        toast({
          title: "Processando PDF",
          description: "Extraindo texto do documento PDF...",
        });

        const extractedText = await extractTextFromPDF(file.content);

        // Organize text with AI
        if (extractedText && !extractedText.includes('[Erro')) {
          setProcessingProgress(70);
          const organizedText = await organizeTextWithAI(extractedText);
          processedDoc.extractedText = organizedText;
          processedDoc.content = organizedText;
        } else {
          processedDoc.extractedText = extractedText;
          processedDoc.content = extractedText;
        }

        processedDoc.status = extractedText.includes('[Erro') ? 'error' : 'completed';
        setProcessingProgress(100);

        if (processedDoc.status === 'error') {
          toast({
            title: "Aviso",
            description: "Extração parcial do PDF. Verifique o conteúdo extraído.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sucesso",
            description: "Texto extraído e organizado com sucesso!",
          });
        }
      } else if (file.type.includes('image')) {
        setProcessingMessage('Processando imagem com IA...');

        toast({
          title: "Processando imagem",
          description: "Extraindo texto da imagem com IA...",
        });

        setProcessingProgress(50);
        const blob = await fetch(file.content).then(r => r.blob());
        const extractedText = await extractTextFromImage(blob as File);

        if (extractedText) {
          processedDoc.extractedText = extractedText;
          processedDoc.content = extractedText;
          processedDoc.status = 'completed';
          setProcessingProgress(100);
          setProcessingMessage('Imagem processada com sucesso!');

          toast({
            title: "Sucesso",
            description: "Texto extraído da imagem com sucesso!",
          });
        } else {
          processedDoc.status = 'error';
          toast({
            title: "Erro",
            description: "Não foi possível extrair texto da imagem.",
            variant: "destructive"
          });
        }
      } else {
        // Plain text
        setProcessingMessage('Processando arquivo de texto...');
        processedDoc.extractedText = file.content;
        processedDoc.content = file.content;
        processedDoc.status = 'completed';
        setProcessingProgress(100);
        setProcessingMessage('Texto processado com sucesso!');
      }

      // Update the processed document
      setProcessedDocuments(prev =>
        prev.map(doc => doc.id === processedDoc.id ? processedDoc : doc)
      );

      // Auto-select document and switch to analyze tab after processing
      if (processedDoc.status === 'completed') {
        setSelectedDocument(processedDoc);
        setTimeout(() => {
          setActiveTab('analyze');
          toast({
            title: "Pronto para análise",
            description: "Documento processado! Agora você pode analisá-lo com IA.",
          });
        }, 1500);
      }

      setIsProcessingDocument(false);

    } catch (error) {
      console.error('Error processing document:', error);
      processedDoc.status = 'error';
      setProcessedDocuments(prev =>
        prev.map(doc => doc.id === processedDoc.id ? processedDoc : doc)
      );

      toast({
        title: "Erro",
        description: "Erro ao processar o documento.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsProcessingDocument(false);
        setProcessingProgress(0);
        setProcessingMessage('');
      }, 1500);
    }
  };

  const analyzeDocument = async () => {
    console.log('analyzeDocument called', {
      selectedDocument: selectedDocument?.name,
      promptLength: analysisPrompt.trim().length
    });

    if (!selectedDocument) {
      toast({
        title: "Nenhum documento selecionado",
        description: "Por favor, selecione um documento processado para analisar.",
        variant: "destructive"
      });
      return;
    }

    if (!analysisPrompt.trim()) {
      toast({
        title: "Prompt vazio",
        description: "Por favor, digite uma pergunta ou prompt para análise.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Clear previous results before starting new analysis
      setAnalysisResults(null);

      console.log('Starting analysis...');
      toast({
        title: "Iniciando análise",
        description: "Analisando documento com IA...",
      });

      // Se já temos o texto extraído, use o analyzeExtractedContent diretamente
      // para evitar reprocessamento desnecessário
      const result = selectedDocument.extractedText
        ? await analyzeExtractedContent(selectedDocument.extractedText, analysisPrompt)
        : await analyzeDocumentWithAI(
            selectedDocument.rawContent || selectedDocument.content,
            analysisPrompt
          );

      console.log('Analysis result:', result);

      if (result) {
        // Handle DocumentAnalysisResult object from analyzeExtractedContent
        const resultText = result.analysis || result.content ||
                          (typeof result === 'string' ? result : JSON.stringify(result));

        setAnalysisResults({
          customAnalysis: resultText,
          summary: resultText.includes('Resumo:') ? resultText.split('Resumo:')[1].split('\n')[0] : undefined
        });

        toast({
          title: "Análise concluída",
          description: "A análise do documento foi concluída com sucesso.",
        });

        // Update document with analysis
        setProcessedDocuments(prev =>
          prev.map(doc =>
            doc.id === selectedDocument.id
              ? { ...doc, analysis: resultText, summary: resultText }
              : doc
          )
        );
      } else {
        toast({
          title: "Análise incompleta",
          description: "A análise não retornou resultados.",
          variant: "destructive"
        });
      }
    } catch (error: unknown) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Erro ao analisar",
        description: error?.message || "Erro ao analisar o documento com IA.",
        variant: "destructive"
      });
    }
  };

  const downloadDocument = (doc: ProcessedDocument) => {
    const element = document.createElement('a');
    const file = new Blob([doc.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.name}_extracted.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência.",
    });
  };

  const selectPredefinedPrompt = (prompt: string) => {
    setAnalysisPrompt(prompt);
  };

  const generateReport = async () => {
    if (!analysisResults || !selectedDocument) return;

    setIsGeneratingReport(true);

    try {
      toast({
        title: "Gerando relatório",
        description: "Salvando análise como relatório...",
      });

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8003';
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${apiUrl}/api/generated-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          title: `Análise: ${selectedDocument.name}`,
          description: analysisPrompt,
          content: analysisResults.customAnalysis,
          report_type: 'document_analysis',
          agent_type: 'document_intelligence',
          metadata: {
            document_name: selectedDocument.name,
            document_type: selectedDocument.type,
            analysis_prompt: analysisPrompt,
            timestamp: new Date().toISOString()
          },
          status: 'generated'
        })
      });

      if (response.ok) {
        toast({
          title: "Relatório gerado",
          description: "Redirecionando para a página de relatórios...",
        });

        // Navigate to reports page
        setTimeout(() => {
          navigate('/reports');
        }, 1000);
      } else {
        throw new Error('Erro ao gerar relatório');
      }
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: error?.message || "Não foi possível salvar o relatório.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const formatAnalysisText = (text: string) => {
    // Split text into lines for better processing
    const lines = text.split('\n');
    const formatted: JSX.Element[] = [];
    let currentList: string[] = [];
    let inTable = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Headers (###, ##, #)
      if (trimmedLine.startsWith('###')) {
        if (currentList.length > 0) {
          formatted.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
              {currentList.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        formatted.push(
          <h3 key={index} className="text-lg font-bold text-gray-800 mt-6 mb-3 border-b-2 border-gray-200 pb-2">
            {trimmedLine.replace(/^###\s*/, '')}
          </h3>
        );
      } else if (trimmedLine.startsWith('##')) {
        if (currentList.length > 0) {
          formatted.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
              {currentList.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        formatted.push(
          <h2 key={index} className="text-xl font-bold text-gray-900 mt-8 mb-4">
            {trimmedLine.replace(/^##\s*/, '')}
          </h2>
        );
      }
      // Bold text with **
      else if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split('**');
        formatted.push(
          <p key={index} className="text-sm mb-2 leading-relaxed">
            {parts.map((part, i) =>
              i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
            )}
          </p>
        );
      }
      // List items (-, *, |)
      else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('|')) {
        const content = trimmedLine.replace(/^[-*|]\s*/, '').replace(/\*\*/g, '');
        if (content) {
          currentList.push(content);
        }
      }
      // Empty line - flush current list
      else if (!trimmedLine && currentList.length > 0) {
        formatted.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
          </ul>
        );
        currentList = [];
      }
      // Regular paragraph
      else if (trimmedLine) {
        if (currentList.length > 0) {
          formatted.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
              {currentList.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        formatted.push(
          <p key={index} className="text-sm text-gray-700 mb-3 leading-relaxed">
            {trimmedLine}
          </p>
        );
      }
    });

    // Flush remaining list items
    if (currentList.length > 0) {
      formatted.push(
        <ul key="list-final" className="list-disc list-inside space-y-1 ml-4 mb-4">
          {currentList.map((item, i) => <li key={i} className="text-sm">{item}</li>)}
        </ul>
      );
    }

    return formatted;
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardContent className="p-0">
          {/* Header with Progress */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Leitor Inteligente de Documentos</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Progress value={calculateProgress()} className="w-24 h-2" />
                <span className="text-xs font-medium text-muted-foreground">
                  {calculateProgress()}%
                </span>
              </div>
            </div>

            {/* Process Steps Indicator */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex items-center space-x-2 transition-all",
                uploadedFiles.length > 0 ? "text-primary scale-105" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "rounded-full p-1.5 transition-all",
                  uploadedFiles.length > 0 ? "bg-primary text-white" : "bg-muted"
                )}>
                  <Upload className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">Upload</span>
              </div>

              <div className="flex-1 h-0.5 bg-muted mx-2" />

              <div className={cn(
                "flex items-center space-x-2 transition-all",
                processedDocuments.length > 0 ? "text-primary scale-105" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "rounded-full p-1.5 transition-all",
                  processedDocuments.length > 0 ? "bg-primary text-white" : "bg-muted"
                )}>
                  <FileCheck className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">Processar</span>
              </div>

              <div className="flex-1 h-0.5 bg-muted mx-2" />

              <div className={cn(
                "flex items-center space-x-2 transition-all",
                analysisResults ? "text-primary scale-105" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "rounded-full p-1.5 transition-all",
                  analysisResults ? "bg-primary text-white" : "bg-muted"
                )}>
                  <Search className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">Analisar</span>
              </div>
            </div>
          </div>

          <div className="p-6">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
                {uploadedFiles.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {uploadedFiles.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="process" className="flex items-center space-x-2">
                <FileCheck className="h-4 w-4" />
                <span>Processar</span>
                {processedDocuments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {processedDocuments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analyze" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Analisar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <FileUpload
                onFileUpload={handleFileUpload}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
              />

              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Documentos Carregados</h4>
                    <Badge variant="secondary">
                      {uploadedFiles.length} arquivo{uploadedFiles.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {uploadedFiles.map((file) => (
                      <Card key={file.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {file.type.includes('image') ? (
                                <Image className="h-5 w-5 text-blue-500" />
                              ) : file.type.includes('pdf') ? (
                                <FileText className="h-5 w-5 text-red-500" />
                              ) : (
                                <FileText className="h-5 w-5 text-green-500" />
                              )}
                              <div>
                                <span className="font-medium">{file.name}</span>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {file.type.includes('image') ? 'Imagem' :
                                     file.type.includes('pdf') ? 'PDF' : 'Texto'}
                                  </Badge>
                                  {file.size && (
                                    <span>{(file.size / 1024).toFixed(2)} KB</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {processedDocuments.find(d => d.id === file.id) ? (
                                <Badge variant="default" className="flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Processado</span>
                                </Badge>
                              ) : isProcessingDocument ? (
                                <Badge variant="secondary" className="flex items-center space-x-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Processando...</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Aguardando</span>
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveFile(file.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>

                          {/* File Preview */}
                          {documentPreview && file.id === uploadedFiles[0].id && !documentPreview.startsWith('data:') && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Preview
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDocumentPreview('')}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                              {file.type.includes('image') && documentPreview.startsWith('data:image') ? (
                                <img
                                  src={documentPreview}
                                  alt="Preview"
                                  className="w-full h-48 object-contain rounded"
                                />
                              ) : (
                                <ScrollArea className="h-32">
                                  <pre className="text-xs whitespace-pre-wrap font-mono">
                                    {documentPreview}
                                  </pre>
                                </ScrollArea>
                              )}
                            </div>
                          )}
                        </div>

                        {isProcessingDocument && file.id === uploadedFiles[0].id && (
                          <div className="space-y-2 px-4 pb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{processingMessage || 'Processando...'}</span>
                              <span className="font-medium">{processingProgress}%</span>
                            </div>
                            <Progress value={processingProgress} className="h-1.5" />
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="process" className="space-y-4">
              {processedDocuments.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Documentos Processados</h4>
                    <Badge variant="outline">
                      {processedDocuments.filter(d => d.status === 'completed').length} / {processedDocuments.length} concluídos
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {processedDocuments.map((doc) => (
                      <Card key={doc.id} className={cn(
                        "transition-all cursor-pointer",
                        selectedDocument?.id === doc.id && "ring-2 ring-primary"
                      )}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-5 w-5" />
                                <div>
                                  <span className="font-medium">{doc.name}</span>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <Badge variant={doc.status === 'completed' ? 'success' :
                                                   doc.status === 'error' ? 'destructive' : 'secondary'}>
                                      {doc.status === 'completed' ? 'Concluído' :
                                       doc.status === 'error' ? 'Erro' : 'Processando'}
                                    </Badge>
                                    <span>{doc.timestamp.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(doc.content);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadDocument(doc);
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setActiveTab('analyze');
                                  }}
                                  disabled={doc.status !== 'completed'}
                                >
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Analisar
                                </Button>
                              </div>
                            </div>

                            {/* Extracted Text Preview */}
                            {doc.extractedText && (
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Texto Extraído
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {doc.extractedText.length} caracteres
                                  </span>
                                </div>
                                <ScrollArea className="h-32">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {doc.extractedText.substring(0, 500)}...
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Nenhum documento processado</AlertTitle>
                  <AlertDescription>
                    Faça upload e processe documentos na aba "Upload" para continuar.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="analyze" className="space-y-4">
              {selectedDocument ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-5 w-5 text-yellow-500" />
                          <span>Análise com IA</span>
                        </div>
                        <Badge variant="outline">
                          {selectedDocument.name}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Predefined Prompts */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Análises Rápidas
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {predefinedPrompts.map((prompt) => (
                            <Button
                              key={prompt.value}
                              variant="outline"
                              size="sm"
                              className="justify-start"
                              onClick={() => selectPredefinedPrompt(prompt.value)}
                            >
                              <prompt.icon className="h-4 w-4 mr-2" />
                              {prompt.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Prompt */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Análise Personalizada
                        </label>
                        <Textarea
                          placeholder="Ex: Resuma os pontos principais, extraia informações de contato, identifique datas importantes..."
                          value={analysisPrompt}
                          onChange={(e) => setAnalysisPrompt(e.target.value)}
                          rows={4}
                          className="w-full"
                        />
                      </div>

                      <Button
                        onClick={analyzeDocument}
                        disabled={isAnalyzing || !analysisPrompt.trim()}
                        className="w-full"
                        size="lg"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analisando... {retryCount > 0 && `(Tentativa ${retryCount})`}
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-5 w-5" />
                            Analisar com IA
                          </>
                        )}
                      </Button>

                      {/* Loading State - Always visible when analyzing */}
                      {isAnalyzing && (
                        <Card className="mt-4 border-primary/50 bg-primary/5 shadow-lg">
                          <CardContent className="p-8">
                            <div className="flex flex-col items-center justify-center space-y-6">
                              <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                                <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                                <Sparkles className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse z-20" />
                              </div>
                              <div className="text-center space-y-2">
                                <p className="text-base font-semibold text-primary">Analisando documento com IA...</p>
                                <p className="text-sm text-muted-foreground animate-pulse">
                                  🤖 Agente processando seu pedido
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Isso pode levar alguns segundos
                                </p>
                              </div>
                              <div className="w-full space-y-2">
                                <Progress value={33} className="w-full h-2 animate-pulse" />
                                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                                  <Brain className="h-3 w-3 animate-pulse" />
                                  <span>Processando com inteligência artificial...</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Analysis Results */}
                      {analysisResults && !isAnalyzing && (
                        <Card className="mt-4 border-green-200 bg-green-50/50">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-5 w-5 text-green-600" />
                                <span>Resultado da Análise</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(analysisResults.customAnalysis || '')}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copiar
                                </Button>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-96">
                              <div className="space-y-2">
                                {analysisResults.customAnalysis && (
                                  <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-100 shadow-sm">
                                    <div className="prose prose-sm max-w-none">
                                      {formatAnalysisText(analysisResults.customAnalysis)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Selecione um documento</AlertTitle>
                  <AlertDescription>
                    Processe um documento na aba "Processar" para poder analisá-lo com IA.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDocumentReader;