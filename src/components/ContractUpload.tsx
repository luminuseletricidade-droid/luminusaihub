
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, WifiOff } from 'lucide-react';
import { useSupabaseOperations } from '@/hooks/useSupabaseOperations';
import { useEnhancedSecurity } from './EnhancedSecurityProvider';
import { useContractExtractionViaStorage } from '@/hooks/useContractExtractionViaStorage';
import { generateContractNumber } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDate, addYears } from '@/lib/dateUtils';
import { generateMaintenances } from '@/utils/generateMaintenances';
import { useErrorRecovery } from '@/hooks/useErrorRecovery';

interface ContractUploadProps {
  onContractExtracted: (contractData: unknown) => void;
  onClose: () => void;
}

const ContractUpload = ({ onContractExtracted, onClose }: ContractUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [createdContract, setCreatedContract] = useState<unknown>(null);
  const [extractedData, setExtractedData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const pendingUploadRef = useRef<{ file: File; contractId: string } | null>(null);

  const { createContract, uploadDocument, createDocumentRecord } = useSupabaseOperations();
  const { extractAndSaveContractData, extractionProgress } = useContractExtractionViaStorage();
  const security = useEnhancedSecurity();

  // Error recovery hook with enhanced retry for network issues
  const { executeWithRecovery, isRecovering, retryCount } = useErrorRecovery({
    maxRetries: 5,
    retryDelay: 2000,
    enableAutoRecovery: true,
    showToast: false, // We handle our own toasts
    onRecovery: () => {
      toast({
        title: 'Conexão restaurada!',
        description: 'Retomando upload do contrato...'
      });
    }
  });

  // Listen for network reconnection to resume uploads
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // If we have a pending upload, notify the user
      if (pendingUploadRef.current && isProcessing) {
        toast({
          title: 'Conexão restaurada',
          description: 'Continuando o upload automaticamente...'
        });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (isProcessing) {
        toast({
          title: 'Sem conexão',
          description: 'Aguardando reconexão para continuar o upload...',
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isProcessing, toast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!user) {
      setError('Usuário não autenticado. Faça login para continuar.');
      return;
    }

    // Rate limiting check
    if (!security.checkRateLimit('upload')) {
      setError('Muitos uploads. Aguarde antes de tentar novamente.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('📄 Iniciando upload do arquivo:', file.name);
      console.log('📝 Tipo do arquivo:', file.type);
      console.log('💾 Tamanho do arquivo:', file.size);

      // ✅ Validação 1: Verificar se usuário está autenticado
      if (!user || !user.id) {
        console.error('❌ Validação falhou: Usuário não autenticado');
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }
      console.log('✅ Validação 1 aprovada: Usuário autenticado (ID:', user.id, ')');

      // ✅ Validação 2: Verificar formato do arquivo
      const isPDF = file.name.toLowerCase().endsWith('.pdf') ||
                    file.type === 'application/pdf' ||
                    file.type === 'application/x-pdf';

      if (!isPDF) {
        console.error('❌ Validação falhou: Arquivo não é PDF');
        throw new Error('Apenas arquivos PDF são permitidos.');
      }
      console.log('✅ Validação 2 aprovada: Arquivo é PDF');

      // ✅ Validação 3: Verificar tamanho do arquivo
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`✅ Validação 3 aprovada: Tamanho do arquivo: ${fileSizeMB.toFixed(2)} MB`);

      // ✅ Validação 4: Verificar se o arquivo tem conteúdo
      if (file.size === 0) {
        console.error('❌ Validação falhou: Arquivo vazio');
        throw new Error('O arquivo está vazio. Por favor, selecione um arquivo PDF válido.');
      }
      console.log('✅ Validação 4 aprovada: Arquivo tem conteúdo');

      // Additional file content validation - temporarily disabled for debugging
      // const isContentValid = await security.validateFileContent(file);
      // if (!isContentValid) {
      //   throw new Error('O arquivo contém conteúdo suspeito ou inválido.');
      // }
      
      // Enhanced security validation completed
      setUploadProgress(10);

      // 2. Criar contrato básico primeiro
      setUploadProgress(20);
      const contractNumber = generateContractNumber();
      
      const contractData = {
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
        .insert([contractData])
        .select()
        .single();

      if (contractError) {
        console.error('Erro ao criar contrato:', contractError);
        throw new Error(`Erro ao criar contrato: ${contractError.message}`);
      }

      console.log('Contrato criado:', newContract);
      setUploadProgress(40);

      // 3. Upload do arquivo para o Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${newContract.id}_original.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      console.log('Fazendo upload do arquivo para:', filePath);

      // Store pending upload reference for network recovery
      pendingUploadRef.current = { file, contractId: newContract.id };

      // Enhanced retry logic with executeWithRecovery (5 retries, exponential backoff)
      const uploadResult = await executeWithRecovery(async () => {
        // Check if we're offline before attempting
        if (!navigator.onLine) {
          throw new Error('Sem conexão com a internet. Aguardando reconexão...');
        }

        const { error } = await supabase.storage
          .from(CONTRACT_DOCUMENTS_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // Allow overwrite on retry
          });

        if (error) {
          console.warn('Upload attempt failed:', error);
          throw error;
        }

        return true;
      });

      // Clear pending upload reference
      pendingUploadRef.current = null;

      if (!uploadResult) {
        console.error('Erro no upload após múltiplas tentativas');
        // Limpar contrato se upload falhar
        await supabase.from('contracts').delete().eq('id', newContract.id);
        throw new Error('Erro no upload após múltiplas tentativas. Verifique sua conexão e tente novamente.');
      }

      console.log('Arquivo enviado com sucesso');
      setUploadProgress(70);

      // 4. Criar registro do documento
      const documentData = {
        contract_id: newContract.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type || 'application/pdf',
        file_size: file.size,
        description: 'Documento original do contrato',
        user_id: user.id,
        metadata: {
          category: 'original',
          original_name: file.name,
          uploaded_at: new Date().toISOString()
        }
      };

      const { error: docError } = await supabase
        .from('contract_documents')
        .insert([documentData]);

      if (docError) {
        console.error('Erro ao registrar documento:', docError);
        // Limpar arquivo e contrato se der erro
        await supabase.storage.from(CONTRACT_DOCUMENTS_BUCKET).remove([filePath]);
        await supabase.from('contracts').delete().eq('id', newContract.id);
        throw new Error(`Erro ao registrar documento: ${docError.message}`);
      }

      console.log('Documento registrado com sucesso');
      setUploadProgress(85);

      // 5. Extrair e salvar dados automaticamente (se PDF)
      // Reutilizando a validação isPDF já feita anteriormente
      if (isPDF) {
        try {
          console.log('🚀 Iniciando extração e salvamento automático dos dados...');
          const extractionResult = await extractAndSaveContractData(file, newContract.id);
          if (extractionResult) {
            setExtractedData(extractionResult);
            console.log('✅ Dados extraídos e salvos automaticamente:', extractionResult);

            // Atualizar toast com informação sobre extração
            toast({
              title: 'Dados do contrato extraídos!',
              description: `Cliente: ${extractionResult.client_name || 'Não identificado'} | Equipamentos: ${extractionResult.equipment?.length || 0}`
            });

            // 6. Buscar contrato atualizado com os dados extraídos para gerar manutenções
            console.log('🔍 Buscando contrato atualizado para gerar manutenções...');
            const { data: updatedContract, error: fetchError } = await supabase
              .from('contracts')
              .select('*')
              .eq('id', newContract.id)
              .single();

            if (fetchError) {
              console.error('❌ Erro ao buscar contrato atualizado:', fetchError);
              throw new Error('Erro ao buscar contrato atualizado');
            }

            if (!updatedContract) {
              console.error('❌ Contrato não encontrado após extração');
              throw new Error('Contrato não encontrado');
            }

            console.log('✅ Contrato atualizado encontrado:', updatedContract);

            // Verificar se temos dados suficientes para gerar manutenções
            if (!updatedContract.start_date || !updatedContract.end_date) {
              console.warn('⚠️ Contrato sem datas definidas, não é possível gerar manutenções automaticamente');
              toast({
                title: 'Atenção',
                description: 'Configure as datas do contrato para gerar manutenções automaticamente.',
                variant: 'default'
              });
            } else {
              // 7. Gerar manutenções automaticamente
              console.log('🔧 Gerando manutenções automaticamente...');
              try {
                const maintenancesResult = await generateMaintenances({
                  contractId: newContract.id,
                  startDate: updatedContract.start_date,
                  endDate: updatedContract.end_date,
                  frequency: extractionResult.maintenance_plan?.frequency || updatedContract.maintenance_frequency || 'monthly',
                  contractType: updatedContract.contract_type || 'maintenance',
                  maintenancePlan: extractionResult.maintenance_plan,
                  services: extractionResult.services || [],
                  equipmentType: extractionResult.equipment?.[0]?.type || 'Gerador',
                  userId: user.id
                });

                if (maintenancesResult.success && maintenancesResult.count > 0) {
                  console.log(`✅ ${maintenancesResult.count} manutenções geradas automaticamente!`);
                  toast({
                    title: 'Manutenções geradas!',
                    description: `${maintenancesResult.count} manutenções foram criadas automaticamente para este contrato.`,
                  });
                } else {
                  console.warn('⚠️ Nenhuma manutenção foi gerada');
                }
              } catch (maintenanceError) {
                console.error('❌ Erro ao gerar manutenções automaticamente:', maintenanceError);
                toast({
                  title: 'Aviso',
                  description: 'Manutenções podem ser geradas manualmente através do botão "Gerar Manutenções".',
                  variant: 'default'
                });
              }
            }
          }
        } catch (extractError) {
          console.warn('⚠️ Extração automática falhou, pode ser feita manualmente:', extractError);
          toast({
            title: 'Extração parcial',
            description: 'Alguns dados podem precisar ser preenchidos manualmente.',
            variant: 'default'
          });
        }
      }

      setUploadProgress(100);
      setUploadComplete(true);
      setCreatedContract(newContract);
      
      // Show success notification
      toast({
        title: 'Contrato importado com sucesso!',
        description: `Contrato ${newContract.contract_number} foi criado e está pronto para edição.`
      });
      
      // Don't auto-close - let user see the results
      // User can click "Abrir Contrato" or "Fechar"

    } catch (error) {
      console.error('Erro no processo de upload:', error);
      const errorMessage = (error && typeof error === 'object' && 'message' in error) 
        ? (error as Error).message 
        : 'Erro desconhecido no upload';
      setError(errorMessage);
      setUploadProgress(0);
      
      // Show error notification
      toast({
        title: 'Erro ao importar contrato',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, createContract, uploadDocument, createDocumentRecord, extractAndSaveContractData, security, toast, executeWithRecovery]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const handleOpenContract = () => {
    if (createdContract) {
      onContractExtracted({
        id: createdContract.id,
        contract_number: createdContract.contract_number,
        status: 'draft',
        needsExtraction: true
      });
      onClose();
    }
  };

  const handleRetry = () => {
    setError(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setCreatedContract(null);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary" />
          Upload de Contrato
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!uploadComplete && !error ? (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-gray-300 hover:border-primary'
              } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">Arraste o contrato ou clique para selecionar</p>
                  <p className="text-gray-500">Apenas arquivos PDF são aceitos</p>
                  <p className="text-sm text-gray-400 mt-2">Sem limite de tamanho</p>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-4">
                {/* Offline/Recovering indicator */}
                {(isOffline || isRecovering) && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <WifiOff className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700">
                      {isOffline
                        ? 'Sem conexão. Aguardando reconexão...'
                        : `Reconectando... (tentativa ${retryCount}/5)`
                      }
                    </span>
                  </div>
                )}
                <LoadingSpinner
                  text={
                    isRecovering ? 'Retomando upload...' :
                    uploadProgress < 20 ? 'Criando contrato...' :
                    uploadProgress < 40 ? 'Enviando arquivo...' :
                    uploadProgress < 70 ? 'Registrando documento...' :
                    uploadProgress < 85 ? 'Extraindo dados com IA...' :
                    extractionProgress > 0 ? `Processando: ${extractionProgress}%` :
                    'Finalizando...'
                  }
                />
                <Progress value={uploadProgress} className="w-full" />
                
                {extractionProgress > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Extração inteligente em progresso...</p>
                    <Progress value={extractionProgress} className="w-full h-2" />
                    <div className="text-xs text-muted-foreground">
                      {extractionProgress < 30 && "📄 Analisando documento..."}
                      {extractionProgress >= 30 && extractionProgress < 60 && "🔍 Identificando informações..."}
                      {extractionProgress >= 60 && extractionProgress < 80 && "💾 Salvando dados..."}
                      {extractionProgress >= 80 && extractionProgress < 95 && "📅 Criando eventos de manutenção..."}
                      {extractionProgress >= 95 && "✅ Finalizando..."}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-destructive mb-2">Erro no Upload</h3>
              <p className="text-destructive">{error}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={handleRetry}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
            <div className="flex items-center justify-center space-x-2 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <CheckCircle className="h-10 w-10 text-green-600 animate-in zoom-in-50 duration-500" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-green-800">PDF Importado com Sucesso!</h3>
                <p className="text-green-700 mt-1">Contrato {createdContract?.contract_number} criado</p>
                <p className="text-sm text-green-600 mt-2">
                  {extractedData ? 'Dados extraídos automaticamente!' : 'Pronto para edição'}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Próximos passos:</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Contrato criado com dados básicos</li>
                <li>• Documento salvo na seção "Documentos"</li>
                <li>• LangExtract habilitado para extração automática</li>
                <li>• Agentes IA já têm acesso ao documento com source grounding</li>
              </ul>
              
              {extractedData && (
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-green-800 font-medium">✨ Dados extraídos automaticamente!</p>
                  <div className="text-green-700 text-sm space-y-1 mt-2">
                    <p>• Cliente: {extractedData.client_name || extractedData.cliente?.nome || 'N/A'}</p>
                    {extractedData.contract_value && <p>• Valor: R$ {extractedData.contract_value}</p>}
                    {extractedData.equipment?.length > 0 && (
                      <p>• Equipamentos: {extractedData.equipment.length} cadastrados</p>
                    )}
                    {extractedData.services?.length > 0 && (
                      <p>• Serviços: {extractedData.services.length} inclusos</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={handleOpenContract}>
                Abrir Contrato
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractUpload;
