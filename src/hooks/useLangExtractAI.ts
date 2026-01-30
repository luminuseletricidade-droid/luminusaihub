import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type ExtractionType = 'contract' | 'maintenance' | 'general';

interface LangExtractResult {
  success: boolean;
  data?: unknown;
  sourceGrounding?: unknown[];
  confidence?: number;
  metadata?: {
    processingTime: number;
    pages: number;
    method: string;
  };
  error?: string;
}

interface ExtractionProgress {
  stage: 'preparing' | 'processing' | 'analyzing' | 'complete';
  progress: number;
  message: string;
}

export const useLangExtractAI = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);

  const validateFile = (file: File): boolean => {
    const maxSizeInMB = 50; // 50MB limit for PDFs
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSizeInMB * 1024 * 1024) {
      throw new Error(`Arquivo muito grande. Máximo ${maxSizeInMB}MB permitido.`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use PDF ou imagens (JPG, PNG, GIF, WEBP).');
    }
    
    return true;
  };

  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string; // data URL
        if (!result || typeof result !== 'string') {
          reject(new Error('Falha ao converter arquivo em base64'));
          return;
        }
        // Remove prefix 'data:...;base64,' e mantenha apenas o payload
        const commaIndex = result.indexOf(',');
        const base64 = commaIndex >= 0 ? result.substring(commaIndex + 1) : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const extractWithLangExtract = async (
    file: File,
    extractionType: ExtractionType = 'contract',
    customSchema?: any
  ): Promise<LangExtractResult | null> => {
    setIsProcessing(true);
    setExtractionProgress({
      stage: 'preparing',
      progress: 10,
      message: 'Preparando arquivo para extração...'
    });

    try {
      console.log('🚀 Iniciando extração LangExtract:', { 
        filename: file.name,
        type: extractionType,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      // Validate file
      validateFile(file);

      setExtractionProgress({
        stage: 'processing',
        progress: 30,
        message: 'Processando arquivo com LangExtract...'
      });

      // Convert to base64
      const pdfBase64 = await convertFileToBase64(file);

      setExtractionProgress({
        stage: 'analyzing',
        progress: 60,
        message: 'Analisando documento com IA...'
      });

      // Call LangExtract processor
      const { data, error } = await supabase.functions.invoke('langextract-processor', {
        body: {
          pdfBase64,
          extractionType,
          schema: customSchema,
          filename: file.name
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro na comunicação com LangExtract');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido na extração');
      }

      setExtractionProgress({
        stage: 'complete',
        progress: 100,
        message: 'Extração concluída com sucesso!'
      });

      console.log('✅ Extração LangExtract concluída:', {
        confidence: data.confidence,
        processingTime: data.metadata?.processingTime,
        method: data.metadata?.method,
        sourceGroundingCount: data.sourceGrounding?.length || 0
      });

      toast({
        title: "Extração concluída",
        description: `Documento processado com ${(data.confidence * 100).toFixed(1)}% de confiança em ${data.metadata?.processingTime || 0}ms.`,
        duration: 4000
      });

      return data;
    } catch (error) {
      console.error('❌ Erro na extração LangExtract:', error);
      
      let errorMessage = "Erro durante a extração. Tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes('muito grande')) {
          errorMessage = 'Arquivo muito grande. Use arquivos menores que 50MB.';
        } else if (error.message.includes('não suportado')) {
          errorMessage = 'Formato não suportado. Use PDF ou imagens.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro na extração",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });

      return null;
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setExtractionProgress(null);
      }, 2000);
    }
  };

  const extractContractData = async (file: File): Promise<any | null> => {
    console.log('📋 Extraindo dados de contrato com LangExtract...');
    
    const contractSchema = {
      cliente: {
        nome: "string",
        cnpj: "string",
        contato: "string",
        endereco: "string",
        telefone: "string",
        email: "string"
      },
      contrato: {
        numero: "string",
        tipo: "string",
        valor_mensal: "number",
        valor_total: "number",
        inicio: "date",
        fim: "date",
        vigencia_meses: "number"
      },
      equipamentos: [{
        tipo: "string",
        modelo: "string",
        marca: "string",
        quantidade: "number",
        localizacao: "string",
        potencia: "string",
        numero_serie: "string"
      }],
      servicos: [{
        nome: "string",
        descricao: "string",
        frequencia: "string",
        duracao_estimada: "number"
      }],
      cronograma: {
        frequencia_geral: "string",
        horario_preferencial: "string",
        dias_semana: "string"
      }
    };

    const result = await extractWithLangExtract(file, 'contract', contractSchema);
    
    if (result?.success) {
      return {
        extractedData: result.data,
        sourceGrounding: result.sourceGrounding,
        confidence: result.confidence,
        metadata: result.metadata
      };
    }
    return null;
  };

  const extractMaintenanceData = async (file: File): Promise<any | null> => {
    console.log('🔧 Extraindo dados de manutenção com LangExtract...');
    
    const maintenanceSchema = {
      equipamento: {
        tipo: "string",
        modelo: "string",
        localizacao: "string"
      },
      manutencao: {
        tipo: "string",
        data_execucao: "date",
        responsavel: "string",
        status: "string"
      },
      checklist: [{
        item: "string",
        status: "boolean",
        observacoes: "string"
      }],
      observacoes_gerais: "string"
    };

    return await extractWithLangExtract(file, 'maintenance', maintenanceSchema);
  };

  const extractGeneralData = async (file: File, customPrompt?: string): Promise<any | null> => {
    console.log('📄 Extração geral com LangExtract...');
    
    const generalSchema = {
      conteudo_principal: "string",
      dados_estruturados: {},
      metadata: {
        tipo_documento: "string",
        paginas: "number",
        qualidade: "string"
      }
    };

    return await extractWithLangExtract(file, 'general', generalSchema);
  };

  return {
    extractWithLangExtract,
    extractContractData,
    extractMaintenanceData,
    extractGeneralData,
    isProcessing,
    extractionProgress
  };
};