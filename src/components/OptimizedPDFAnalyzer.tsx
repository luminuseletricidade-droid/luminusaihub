import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import FileUpload from '@/components/FileUpload';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useVisionAI } from '@/hooks/useVisionAI';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Calendar,
  DollarSign,
  Settings,
  Download,
  Copy
} from 'lucide-react';

interface ProcessedPDF {
  id: string;
  name: string;
  file: File;
  analysis: unknown;
  timestamp: Date;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

export const OptimizedPDFAnalyzer: React.FC = () => {
  const [processedPDFs, setProcessedPDFs] = useState<ProcessedPDF[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<ProcessedPDF | null>(null);
  const { analyzeContract, isProcessing } = useVisionAI();
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (uploadedFiles: unknown[]) => {
    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile.type !== 'application/pdf' && !uploadedFile.type.startsWith('image/')) {
        toast({
          title: "Arquivo não suportado",
          description: "Use apenas arquivos PDF ou imagens",
          variant: "destructive"
        });
        continue;
      }

      const pdfId = uploadedFile.id;
      const newPDF: ProcessedPDF = {
        id: pdfId,
        name: uploadedFile.name,
        file: uploadedFile as unknown, // Store the uploaded file data
        analysis: null,
        timestamp: new Date(),
        status: 'processing'
      };

      setProcessedPDFs(prev => [...prev, newPDF]);

      try {
        console.log('🔍 Iniciando análise otimizada do PDF:', uploadedFile.name);
        // Convert base64 content back to File-like object for analysis
        const analysis = await analyzeContract(uploadedFile.content);
        
        if (analysis) {
          setProcessedPDFs(prev => prev.map(pdf => 
            pdf.id === pdfId 
              ? { ...pdf, analysis, status: 'completed' as const }
              : pdf
          ));
          
          toast({
            title: "PDF analisado",
            description: `${uploadedFile.name} foi processado com sucesso`,
          });
        } else {
          throw new Error('Falha na análise do documento');
        }
      } catch (error) {
        console.error('Erro na análise do PDF:', error);
        setProcessedPDFs(prev => prev.map(pdf => 
          pdf.id === pdfId 
            ? { 
                ...pdf, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              }
            : pdf
        ));
      }
    }
  }, [analyzeContract, toast]);

  const [uploadedFiles, setUploadedFiles] = useState<unknown[]>([]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const getStatusBadge = (status: ProcessedPDF['status']) => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary" className="animate-pulse">Processando</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: "Conteúdo copiado para a área de transferência",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const downloadAnalysis = (pdf: ProcessedPDF) => {
    if (!pdf.analysis) return;
    
    const content = JSON.stringify(pdf.analysis, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-${pdf.name.replace('.pdf', '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContractInfo = (analysis: unknown) => {
    if (!analysis) return null;

    return (
      <div className="space-y-4">
        {/* Document Info */}
        {analysis.documento_info && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informações do Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <p className="text-sm text-muted-foreground">{analysis.documento_info.tipo || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Qualidade:</span>
                  <Badge variant={analysis.documento_info.qualidade_scan === 'alta' ? 'default' : 'secondary'}>
                    {analysis.documento_info.qualidade_scan || 'N/A'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Info */}
        {analysis.cliente && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Nome:</span>
                <p className="text-sm text-muted-foreground">{analysis.cliente.nome || 'Não informado'}</p>
              </div>
              {analysis.cliente.cnpj && (
                <div>
                  <span className="text-sm font-medium">CNPJ:</span>
                  <p className="text-sm text-muted-foreground">{analysis.cliente.cnpj}</p>
                </div>
              )}
              {analysis.cliente.endereco_completo && (
                <div>
                  <span className="text-sm font-medium">Endereço:</span>
                  <p className="text-sm text-muted-foreground">{analysis.cliente.endereco_completo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contract Info */}
        {analysis.contrato && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Informações Contratuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Número:</span>
                  <p className="text-sm text-muted-foreground">{analysis.contrato.numero || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <p className="text-sm text-muted-foreground">{analysis.contrato.tipo || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Início:</span>
                  <p className="text-sm text-muted-foreground">{analysis.contrato.data_inicio || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Término:</span>
                  <p className="text-sm text-muted-foreground">{analysis.contrato.data_fim || 'Não informado'}</p>
                </div>
              </div>
              {(analysis.contrato.valor_mensal || analysis.contrato.valor_total) && (
                <div className="pt-2">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Valores:
                  </span>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    {analysis.contrato.valor_mensal && (
                      <p className="text-sm text-muted-foreground">
                        Mensal: {analysis.contrato.valor_mensal}
                      </p>
                    )}
                    {analysis.contrato.valor_total && (
                      <p className="text-sm text-muted-foreground">
                        Total: {analysis.contrato.valor_total}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment */}
        {analysis.equipamentos && analysis.equipamentos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Equipamentos ({analysis.equipamentos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.equipamentos.map((equip: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Tipo:</strong> {equip.tipo || 'N/A'}</div>
                      <div><strong>Modelo:</strong> {equip.modelo || 'N/A'}</div>
                      <div><strong>Marca:</strong> {equip.marca || 'N/A'}</div>
                      <div><strong>Quantidade:</strong> {equip.quantidade || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {analysis.servicos_contratados && analysis.servicos_contratados.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Serviços Contratados ({analysis.servicos_contratados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.servicos_contratados.map((service: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium">{service.nome || 'Serviço sem nome'}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{service.descricao || 'Sem descrição'}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span><strong>Frequência:</strong> {service.frequencia || 'N/A'}</span>
                      {service.duracao_estimada && (
                        <span><strong>Duração:</strong> {service.duracao_estimada}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Analisador de PDFs Otimizado
          </CardTitle>
          <CardDescription>
            Análise avançada de contratos PDF usando IA Vision com máxima precisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveFile={handleRemoveFile}
          />
          
          {isProcessing && (
            <Alert className="mt-4">
              <LoadingSpinner className="w-4 h-4" />
              <AlertTitle>Processando...</AlertTitle>
              <AlertDescription>
                Analisando documento com IA Vision. Aguarde...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {processedPDFs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos Processados ({processedPDFs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedPDFs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedPDF(pdf)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-medium">{pdf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pdf.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(pdf.status)}
                    {pdf.status === 'completed' && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAnalysis(pdf);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(JSON.stringify(pdf.analysis, null, 2));
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPDF && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Análise: {selectedPDF.name}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPDF(null)}
              >
                Fechar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPDF.status === 'error' ? (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Erro na análise</AlertTitle>
                <AlertDescription>{selectedPDF.error}</AlertDescription>
              </Alert>
            ) : selectedPDF.status === 'processing' ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Processando documento...</span>
              </div>
            ) : (
              <Tabs defaultValue="structured" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="structured">Dados Estruturados</TabsTrigger>
                  <TabsTrigger value="raw">Texto Completo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structured" className="mt-4">
                  {renderContractInfo(selectedPDF.analysis)}
                </TabsContent>
                
                <TabsContent value="raw" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Texto Extraído</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-auto">
                        <pre className="whitespace-pre-wrap text-sm">
                          {selectedPDF.analysis?.texto_completo || 'Nenhum texto extraído'}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};