import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Users, Calendar, DollarSign, AlertCircle, CheckCircle, X, Eye, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseOperations } from '@/hooks/useSupabaseOperations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatWithFileContext } from '@/components/ChatWithFileContext';

interface ExtractedData {
  contract_number?: string;
  client_name?: string;
  value?: string;
  start_date?: string;
  end_date?: string;
  equipment?: string;
  services?: string;
  observations?: string;
  confidence_level?: 'high' | 'medium' | 'low';
  raw_text?: string;
  structured_data?: unknown;
}

interface UploadedFile {
  file: File;
  extractedData?: ExtractedData;
  isProcessing: boolean;
  error?: string;
  id: string;
}

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [showChatMode, setShowChatMode] = useState(false);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatExtractedData, setChatExtractedData] = useState<unknown>(null);
  const { toast } = useToast();
  const { createContract } = useSupabaseOperations();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      isProcessing: true,
      id: `${Date.now()}-${Math.random()}`
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    for (const fileObj of newFiles) {
      try {
        await processFile(fileObj);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, isProcessing: false, error: 'Erro ao processar arquivo' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  }, [processFile]);

  const processFile = async (fileObj: UploadedFile) => {
    try {
      const base64 = await fileToBase64(fileObj.file);
      
      const { data, error } = await supabase.functions.invoke('extract-contract-data', {
        body: {
          file: {
            name: fileObj.file.name,
            content: base64,
            type: fileObj.file.type,
            size: fileObj.file.size
          }
        }
      });

      if (error) throw error;

      const extractedData: ExtractedData = data.extractedData || {};
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, extractedData, isProcessing: false }
            : f
        )
      );

      toast({
        title: "Arquivo processado com sucesso!",
        description: `Dados extraídos de ${fileObj.file.name}`,
        action: (
          <ToastAction 
            altText="Abrir Chat" 
            onClick={() => openChatWithFile(fileObj.file, extractedData)}
          >
            Conversar sobre os dados
          </ToastAction>
        )
      });

    } catch (error) {
      console.error('Erro na extração:', error);
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, isProcessing: false, error: 'Falha na extração de dados' }
            : f
        )
      );
      
      toast({
        title: "Erro no processamento",
        description: "Não foi possível extrair os dados do arquivo.",
        variant: "destructive"
      });
    }
  };

  const openChatWithFile = (file: File, extractedData: unknown) => {
    setChatFile(file);
    setChatExtractedData(extractedData);
    setShowChatMode(true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const viewDetails = (file: UploadedFile) => {
    setSelectedFile(file);
  };

  const saveContractData = async (file: UploadedFile) => {
    if (!file.extractedData) return;

    try {
      await createContract({
        contract_number: file.extractedData.contract_number || `AUTO-${Date.now()}`,
        contract_type: 'maintenance',
        value: parseFloat(file.extractedData.value?.replace(/[^\d.,]/g, '').replace(',', '.') || '0'),
        start_date: file.extractedData.start_date || null,
        end_date: file.extractedData.end_date || null,
        description: file.extractedData.observations || '',
        services: file.extractedData.services ? [file.extractedData.services] : [],
        status: 'active'
      });

      toast({
        title: "Contrato salvo!",
        description: "Os dados foram salvos no sistema.",
        action: (
          <ToastAction 
            altText="Abrir Chat"
            onClick={() => openChatWithFile(file.file, file.extractedData)}
          >
            Conversar sobre o contrato
          </ToastAction>
        )
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o contrato.",
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

  if (showChatMode && chatFile) {
    return (
      <ChatWithFileContext
        initialFile={chatFile}
        extractedData={chatExtractedData}
        contractContext={{
          contract_number: chatExtractedData?.contract_number,
          client_name: chatExtractedData?.client_name,
          extracted_data: chatExtractedData
        }}
        onBack={() => {
          setShowChatMode(false);
          setChatFile(null);
          setChatExtractedData(null);
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload de Contratos</h1>
          <p className="text-muted-foreground">
            Faça upload de contratos em PDF para extração automática de dados
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos</CardTitle>
          <CardDescription>
            Arraste e solte arquivos PDF ou clique para selecionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Solte os arquivos aqui' : 'Upload de Contratos'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Arraste e solte arquivos PDF ou clique para selecionar
            </p>
            <Button variant="outline" disabled={isUploading}>
              {isUploading ? 'Processando...' : 'Selecionar Arquivos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Processados ({uploadedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((fileObj) => (
                <div key={fileObj.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">{fileObj.file.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(fileObj.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {fileObj.isProcessing && (
                        <Badge variant="secondary">Processando...</Badge>
                      )}
                      {fileObj.error && (
                        <Badge variant="destructive">Erro</Badge>
                      )}
                      {fileObj.extractedData && (
                        <Badge variant="default">Processado</Badge>
                      )}
                    </div>
                  </div>

                  {fileObj.isProcessing && (
                    <div className="mb-3">
                      <Progress value={undefined} className="w-full" />
                      <p className="text-sm text-muted-foreground mt-1">
                        Extraindo dados do documento...
                      </p>
                    </div>
                  )}

                  {fileObj.error && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{fileObj.error}</AlertDescription>
                    </Alert>
                  )}

                  {fileObj.extractedData && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {fileObj.extractedData.contract_number && (
                          <div>
                            <strong>Contrato:</strong> {fileObj.extractedData.contract_number}
                          </div>
                        )}
                        {fileObj.extractedData.client_name && (
                          <div>
                            <strong>Cliente:</strong> {fileObj.extractedData.client_name}
                          </div>
                        )}
                        {fileObj.extractedData.value && (
                          <div>
                            <strong>Valor:</strong> {fileObj.extractedData.value}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => viewDetails(fileObj)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openChatWithFile(fileObj.file, fileObj.extractedData)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat IA
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => saveContractData(fileObj)}
                        >
                          Salvar Contrato
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => removeFile(fileObj.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato - {selectedFile?.file.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedFile?.extractedData && (
              <Tabs defaultValue="structured" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="structured">Dados Estruturados</TabsTrigger>
                  <TabsTrigger value="raw">Texto Bruto</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structured" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedFile.extractedData).map(([key, value]) => {
                      if (key === 'raw_text' || !value) return null;
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-sm font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <p className="text-sm text-muted-foreground border rounded p-2">
                            {String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="raw">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texto Extraído</label>
                    <div className="border rounded p-4 bg-muted/50 max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {selectedFile.extractedData.raw_text || 'Texto não disponível'}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadPage;
