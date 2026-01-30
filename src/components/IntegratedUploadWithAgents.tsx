import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Settings, 
  BarChart3, 
  Clock, 
  Download, 
  Loader, 
  CheckCircle, 
  AlertCircle,
  X,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateMaintenances } from '@/utils/generateMaintenances';

interface IntegratedUploadWithAgentsProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contract: unknown) => void;
}

const IntegratedUploadWithAgents: React.FC<IntegratedUploadWithAgentsProps> = ({
  isOpen,
  onClose,
  onContractCreated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState<unknown>(null);
  const [extractedData, setExtractedData] = useState<unknown>(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedData(null);
      setGeneratedDocument(null);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive"
      });
    }
  };

  const simulateExtraction = async () => {
    // Simular progresso de extração
    for (let i = 0; i <= 100; i += 10) {
      setExtractionProgress(i);
      
      if (i === 20) setProcessingStatus('Lendo estrutura do PDF...');
      if (i === 40) setProcessingStatus('Identificando dados do contrato...');
      if (i === 60) setProcessingStatus('Extraindo informações do cliente...');
      if (i === 80) setProcessingStatus('Analisando equipamentos e serviços...');
      if (i === 100) setProcessingStatus('Processamento concluído!');
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
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

    setIsProcessing(true);
    setUploadProgress(0);
    setExtractionProgress(0);
    setProcessingStatus('Iniciando processamento...');

    try {
      // Simular upload
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Processar extração
      await simulateExtraction();

      // Gerar número único de contrato
      const generateUniqueContractNumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-6); // últimos 6 dígitos
        return `CONT-${year}${month}-${timestamp}`;
      };

      // Simular dados extraídos
      const mockExtractedData = {
        contract_number: generateUniqueContractNumber(),
        client_name: 'AÇÃO DA CIDADANIA',
        client_cnpj: '00.346.076/0001-73',
        equipment_type: 'Gerador 150 kVA',
        contract_value: 58068.00,
        start_date: '2025-08-01',
        end_date: '2026-07-31',
        services: [
          'Manutenção Preventiva Mensal',
          'Assistência Técnica 24h',
          'Fornecimento de Peças'
        ]
      };

      setExtractedData(mockExtractedData);

      // Gerar documento baseado no agente selecionado (se houver)
      let generatedDoc = null;
      if (selectedAgent) {
        const agentData = agents[selectedAgent as keyof typeof agents];
        generatedDoc = {
          type: selectedAgent,
          title: `${agentData.name} - ${mockExtractedData.client_name}`,
          content: 'Documento processado com sucesso',
          data: mockExtractedData
        };
      }
      setGeneratedDocument(generatedDoc);

      // Criar contrato no banco
      if (user) {
        // Primeiro, criar ou buscar o cliente
        let clientId = null;
        
        // Verificar se o cliente já existe
        const { data: existingClient, error: searchError } = await supabase
          .from('clients')
          .select('id')
          .eq('name', mockExtractedData.client_name)
          .eq('user_id', user.id)
          .maybeSingle();

        if (searchError) {
          console.warn('Erro ao buscar cliente existente:', searchError);
        }

        if (existingClient) {
          clientId = existingClient.id;
          console.log('Cliente existente encontrado:', existingClient.id);
        } else {
          // Criar novo cliente
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: mockExtractedData.client_name || 'Cliente',
              cnpj: mockExtractedData.client_cnpj || '',
              address: 'Endereço a ser atualizado',
              phone: '',
              email: '',
              contact_person: ''
            })
            .select()
            .single();

          if (clientError) {
            console.error('Erro ao criar cliente:', clientError);
            throw new Error(`Erro ao criar cliente: ${clientError.message}`);
          }
          
          if (!newClient) {
            throw new Error('Cliente não foi criado corretamente');
          }
          
          clientId = newClient.id;
          console.log('Novo cliente criado:', newClient.id);
        }

        if (!clientId) {
          throw new Error('Não foi possível obter ID do cliente');
        }

        // Verificar se já existe contrato com mesmo número
        const contractNumber = mockExtractedData.contract_number;
        const { data: existingContract } = await supabase
          .from('contracts')
          .select('id')
          .eq('contract_number', contractNumber)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingContract) {
          throw new Error(`Já existe um contrato com o número ${contractNumber}. Use um número diferente ou edite o contrato existente.`);
        }

        // Criar o contrato com o client_id
        const { data: newContract, error: contractError } = await supabase
          .from('contracts')
          .insert({
            user_id: user.id,
            client_id: clientId,
            contract_number: contractNumber,
            client_name: mockExtractedData.client_name || 'Cliente',
            value: mockExtractedData.contract_value || 0,
            start_date: mockExtractedData.start_date || new Date().toISOString().split('T')[0],
            end_date: mockExtractedData.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            status: 'active',
            contract_type: 'maintenance',
            equipment_type: mockExtractedData.equipment_type || 'Equipamento',
            equipment_model: '',
            equipment_location: '',
            services: mockExtractedData.services || [],
            description: selectedAgent ? `Documento processado com agente: ${agents[selectedAgent as keyof typeof agents]?.name}` : 'Dados extraídos via Upload Inteligente'
          })
          .select()
          .single();

        if (contractError) {
          console.error('Erro ao criar contrato:', contractError);
          throw new Error(`Erro ao criar contrato: ${contractError.message}`);
        }
        
        if (!newContract) {
          throw new Error('Contrato não foi criado corretamente');
        }

        console.log('Contrato criado com sucesso:', newContract.id);

        // Gerar manutenções automaticamente para o contrato
        const maintenanceResult = await generateMaintenances({
          contractId: newContract.id,
          startDate: newContract.start_date,
          endDate: newContract.end_date,
          frequency: 'monthly',
          contractType: newContract.contract_type,
          userId: user.id
        });

        if (maintenanceResult.success) {
          console.log(`${maintenanceResult.count} manutenções criadas`);
        }

        toast({
          title: "Sucesso!",
          description: maintenanceResult.success 
            ? `Contrato criado com ${maintenanceResult.count} manutenções programadas`
            : selectedAgent ? "Contrato criado e documento processado" : "Contrato criado com sucesso",
        });

        if (onContractCreated) {
          onContractCreated(newContract);
        }
      } else {
        throw new Error('Usuário não autenticado');
      }

    } catch (error) {
      console.error('Erro no processamento:', error);
      
      let errorMessage = "Ocorreu um erro ao processar o arquivo";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as unknown).message;
      }
      
      // Mensagens mais amigáveis para erros comuns
      if (errorMessage.includes('client_id')) {
        errorMessage = "Erro ao processar dados do cliente. Tente novamente.";
      } else if (errorMessage.includes('user not authenticated')) {
        errorMessage = "Você precisa estar logado para fazer upload.";
      } else if (errorMessage.includes('network') || errorMessage.includes('websocket')) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      }
      
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Reset states em caso de erro
      setExtractedData(null);
      setGeneratedDocument(null);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Upload Inteligente com Agentes IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecione o Arquivo PDF</CardTitle>
              <CardDescription>
                Faça upload do contrato para análise e processamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button variant="outline" size="sm">
                        Trocar arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Clique para selecionar ou arraste um arquivo PDF
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Agent Selection */}
          {selectedFile && !isProcessing && !extractedData && (
            <Card>
              <CardHeader>
                <CardTitle>2. Escolha o Agente Especializado (Opcional)</CardTitle>
                <CardDescription>
                  Selecione um agente para gerar documentos especializados, ou pule esta etapa para apenas extrair dados do contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(agents).map(([key, agent]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedAgent(key)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAgent === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${agent.color} text-white`}>
                          {agent.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{agent.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleProcessFile} 
                    className="gap-2"
                  >
                    Apenas Extrair Dados
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {selectedAgent && (
                    <Button onClick={handleProcessFile} className="gap-2">
                      Processar com {agents[selectedAgent as keyof typeof agents]?.name}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle>Processando Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Upload do arquivo</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>

                {uploadProgress === 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Extração e análise IA</span>
                      <span>{extractionProgress}%</span>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader className="h-4 w-4 animate-spin" />
                      {processingStatus}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {generatedDocument ? 'Processamento Concluído' : 'Extração de Dados Concluída'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Contrato criado:</strong> {extractedData.contract_number}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Dados Extraídos:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{extractedData.client_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CNPJ:</span>
                      <p className="font-medium">{extractedData.client_cnpj}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Equipamento:</span>
                      <p className="font-medium">{extractedData.equipment_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <p className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(extractedData.contract_value)}
                      </p>
                    </div>
                  </div>
                </div>

                {generatedDocument && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Documento Gerado:</h4>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">{generatedDocument.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {generatedDocument.content}
                      </p>
                    </div>
                  </div>
                )}

                {!generatedDocument && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Dados extraídos com sucesso!</strong> Você pode acessar este contrato na lista de contratos ou gerar documentos especializados mais tarde usando os agentes na aba "Documentos".
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Ver Contrato
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntegratedUploadWithAgents;
