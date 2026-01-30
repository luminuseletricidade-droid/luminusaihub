import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDate, addYears } from '@/lib/dateUtils';
import { findOrCreateClient } from '@/lib/clientUtils';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  MessageCircle,
  Settings,
  Zap,
  Clock
} from 'lucide-react';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ContractFieldMapper from './ContractFieldMapper';
import { ModernContractChat } from './ModernContractChat';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface IntegratedContractUploadProps {
  onContractComplete: (contractData: unknown) => void;
  onClose: () => void;
}

type ProcessStep = 'upload' | 'mapping' | 'chat' | 'complete';

interface ProcessingStatus {
  step: ProcessStep;
  progress: number;
  message: string;
  error?: string;
}

const IntegratedContractUpload = ({ onContractComplete, onClose }: IntegratedContractUploadProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<ProcessingStatus>({
    step: 'upload',
    progress: 0,
    message: 'Aguardando upload do documento...'
  });
  
  const [contractData, setContractData] = useState<unknown>(null);
  const [extractedData, setExtractedData] = useState<unknown>(null);
  const [currentTab, setCurrentTab] = useState('upload');
  const [fileContext, setFileContext] = useState<unknown>(null);

  const updateStatus = (newStatus: Partial<ProcessingStatus>) => {
    setStatus(prev => ({ ...prev, ...newStatus }));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!user) {
      updateStatus({
        step: 'upload',
        progress: 0,
        message: 'Erro de autenticação',
        error: 'Usuário não autenticado. Faça login para continuar.'
      });
      return;
    }

    setContractData(null);
    setExtractedData(null);
    setFileContext(null);
    setCurrentTab('upload');
    setStatus({
      step: 'upload',
      progress: 0,
      message: 'Iniciando processamento...'
    });

    try {
      // Validações iniciais
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo permitido: 50MB');
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou imagens.');
      }

      // Etapa 1: Criar contrato básico
      updateStatus({ progress: 10, message: 'Criando registro do contrato...' });
      
      const contractNumber = `CTR-${Date.now()}`;
      const contractPayload = {
        contract_number: contractNumber,
        contract_type: 'maintenance',
        status: 'draft',
        description: `Contrato criado via upload - ${file.name}`,
        value: 0,
        start_date: getCurrentDate(),
        end_date: addYears(getCurrentDate(), 1),
        user_id: user.id
      };

      const { data: newContract, error: contractError } = await supabase
        .from('contracts')
        .insert([contractPayload])
        .select()
        .single();

      if (contractError) {
        console.error('Erro ao criar contrato:', contractError);
        throw new Error(`Erro ao criar contrato: ${contractError.message}`);
      }

      updateStatus({ progress: 20, message: 'Fazendo upload do documento...' });

      // Etapa 2: Upload do arquivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${newContract.id}_original.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        // Limpar contrato criado
        await supabase.from('contracts').delete().eq('id', newContract.id);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      updateStatus({ progress: 40, message: 'Registrando documento...' });

      // Etapa 3: Registrar documento
      const documentPayload = {
        contract_id: newContract.id,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category: 'original',
        description: 'Documento original do contrato',
        uploaded_by: user.id
      };

      const { error: docError } = await supabase
        .from('contract_documents')
        .insert([documentPayload]);

      if (docError) {
        console.error('Erro ao registrar documento:', docError);
        // Limpar arquivo e contrato
        await supabase.storage.from(CONTRACT_DOCUMENTS_BUCKET).remove([filePath]);
        await supabase.from('contracts').delete().eq('id', newContract.id);
        throw new Error(`Erro ao registrar documento: ${docError.message}`);
      }

      updateStatus({ progress: 60, message: 'Extraindo dados com IA...' });

      // Etapa 4: Extração de dados com IA
      try {
        const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-contract-data', {
          body: {
            contractId: newContract.id,
            filePath: filePath,
            fileName: file.name
          }
        });

        if (extractionError) {
          console.warn('Erro na extração IA:', extractionError);
          // Continuar mesmo com erro na extração
          setExtractedData({
            texto_completo: 'Extração automática falhou - dados precisam ser inseridos manualmente',
            observacoes_extracao: 'Falha na extração automática'
          });
        } else {
          setExtractedData(extractionResult?.analysis || {});
        }
      } catch (extractionError) {
        console.warn('Erro na extração IA:', extractionError);
        setExtractedData({
          texto_completo: 'Extração automática falhou - dados precisam ser inseridos manualmente',
          observacoes_extracao: 'Falha na extração automática'
        });
      }

      updateStatus({ progress: 80, message: 'Preparando contexto para IA...' });

      // Etapa 5: Preparar contexto para chat
      try {
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          // Para PDFs e imagens, usar base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setFileContext({
              file: {
                name: file.name,
                size: file.size,
                content: content,
                type: file.type
              },
              enabled: true
            });
          };
          reader.readAsDataURL(file);
        } else {
          // Para documentos de texto, ler como texto
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setFileContext({
              file: {
                name: file.name,
                size: file.size,
                content: content,
                type: file.type
              },
              enabled: true
            });
          };
          reader.readAsText(file);
        }
      } catch (contextError) {
        console.warn('Erro ao preparar contexto:', contextError);
        setFileContext({
          file: {
            name: file.name,
            size: file.size,
            content: '',
            type: file.type
          },
          enabled: false
        });
      }

      updateStatus({ 
        step: 'mapping', 
        progress: 100, 
        message: 'Processamento concluído! Revise os dados extraídos.' 
      });

      setContractData(newContract);
      setCurrentTab('mapping');

      toast({
        title: "Upload concluído",
        description: "Documento processado e pronto para revisão.",
      });

    } catch (error) {
      console.error('Erro no processamento:', error);
      const errorMessage = (error && typeof error === 'object' && 'message' in error) 
        ? (error as Error).message 
        : 'Erro desconhecido';
      
      updateStatus({
        step: 'upload',
        progress: 0,
        message: 'Erro no processamento',
        error: errorMessage
      });
      
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: status.progress > 0 && status.progress < 100
  });

  const handleMappingComplete = (savedContract: unknown) => {
    setContractData(savedContract);
    updateStatus({
      step: 'chat',
      progress: 100,
      message: 'Dados salvos! Chat IA disponível.'
    });
    setCurrentTab('chat');
    
    toast({
      title: "Contrato salvo com sucesso!",
      description: "Agora você pode conversar com a IA sobre o contrato.",
    });
  };

  const handleChatComplete = () => {
    updateStatus({
      step: 'complete',
      progress: 100,
      message: 'Processo concluído!'
    });
    onContractComplete(contractData);
  };

  const handleRetry = () => {
    setStatus({
      step: 'upload',
      progress: 0,
      message: 'Aguardando upload do documento...'
    });
    setContractData(null);
    setExtractedData(null);
    setFileContext(null);
    setCurrentTab('upload');
  };

  const getStepBadge = (step: ProcessStep, currentStep: ProcessStep) => {
    if (currentStep === step) {
      return <Badge className="bg-primary">Em andamento</Badge>;
    } else if (getStepOrder(currentStep) > getStepOrder(step)) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluído</Badge>;
    } else {
      return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
    }
  };

  const getStepOrder = (step: ProcessStep): number => {
    const order = { upload: 1, mapping: 2, chat: 3, complete: 4 };
    return order[step] || 0;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header com progresso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Upload de Contratos</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{status.message}</span>
                <span>{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="w-full" />
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-between space-x-4 py-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload</span>
                {getStepBadge('upload', status.step)}
              </div>
              
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Processamento</span>
                {status.progress > 0 && status.progress < 100 ? 
                  <Badge className="bg-primary">Em andamento</Badge> : 
                  status.progress === 100 ? 
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluído</Badge> : 
                    <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                }
              </div>
              
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">Mapeamento</span>
                {getStepBadge('mapping', status.step)}
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Chat IA</span>
                {getStepBadge('chat', status.step)}
              </div>
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Concluído</span>
                {getStepBadge('complete', status.step)}
              </div>
            </div>

            {status.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{status.error}</span>
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    Tentar Novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo das tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" disabled={status.step !== 'upload'}>
            1. Upload & Processamento
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={status.step !== 'mapping'}>
            2. Mapeamento de Dados
          </TabsTrigger>
          <TabsTrigger value="chat" disabled={status.step !== 'chat' && status.step !== 'complete'}>
            3. Chat IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardContent className="p-8">
              {status.progress > 0 && status.progress < 100 ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <LoadingSpinner text={status.message} />
                  </div>
                  
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Processamento em andamento:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className={status.progress >= 20 ? "text-green-600" : ""}>
                        {status.progress >= 20 ? "✓" : "⏳"} Criação do contrato
                      </li>
                      <li className={status.progress >= 40 ? "text-green-600" : ""}>
                        {status.progress >= 40 ? "✓" : "⏳"} Upload do documento
                      </li>
                      <li className={status.progress >= 60 ? "text-green-600" : ""}>
                        {status.progress >= 60 ? "✓" : "⏳"} Registro no sistema
                      </li>
                      <li className={status.progress >= 80 ? "text-green-600" : ""}>
                        {status.progress >= 80 ? "✓" : "⏳"} Extração de dados com IA
                      </li>
                      <li className={status.progress >= 100 ? "text-green-600" : ""}>
                        {status.progress >= 100 ? "✓" : "⏳"} Preparação do contexto
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-gray-300 hover:border-primary'
                  } ${status.progress > 0 && status.progress < 100 ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <input {...getInputProps()} />
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-primary text-lg font-medium">Solte o arquivo aqui...</p>
                  ) : (
                    <>
                      <h3 className="text-xl font-medium mb-2">
                        Arraste o contrato ou clique para selecionar
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Sistema inteligente com processamento automático
                      </p>
                      <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>PDF, DOC, DOCX</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Sparkles className="h-4 w-4 text-blue-500" />
                          <span>Extração IA</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4 w-4 text-purple-500" />
                          <span>Chat Inteligente</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-4">Máximo: 50MB</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          {contractData && extractedData && (
            <ContractFieldMapper
              contractId={contractData.id}
              extractedData={extractedData}
              fullText={extractedData.texto_completo}
              onSaveSuccess={handleMappingComplete}
              onCancel={() => setCurrentTab('upload')}
            />
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              {contractData && fileContext && (
                <ModernContractChat
                  contract={contractData}
                  onBack={() => setCurrentTab('mapping')}
                  showHeader={false}
                  fileContext={fileContext}
                />
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={handleChatComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar e Abrir Contrato
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedContractUpload;
