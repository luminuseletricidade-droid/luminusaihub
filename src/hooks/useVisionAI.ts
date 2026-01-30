
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type VisionAnalysisType = 'document_ocr' | 'equipment_analysis' | 'report_analysis' | 'general_analysis';

interface VisionAnalysisResult {
  success: boolean;
  analysis: string;
  analysisType: VisionAnalysisType;
  error?: string;
}

export const useVisionAI = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = (file: File): boolean => {
    const maxSizeInMB = 50; // 50MB limit
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    if (file.size > maxSizeInMB * 1024 * 1024) {
      throw new Error(`Arquivo muito grande. Máximo ${maxSizeInMB}MB permitido.`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use imagens (JPG, PNG, GIF, WEBP) ou PDF.');
    }
    
    return true;
  };

  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const analyzeWithRetry = async (
    imageDataUrls: string[],
    analysisType: VisionAnalysisType,
    prompt?: string,
    maxRetries: number = 2
  ): Promise<unknown> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Tentativa ${attempt + 1}/${maxRetries + 1} - Enviando para vision-processor...`);
        
        const { data, error } = await supabase.functions.invoke('vision-processor', {
          body: {
            images: imageDataUrls,
            analysisType,
            prompt
          }
        });

        if (error) {
          throw new Error(error.message || 'Erro na comunicação com o serviço de visão');
        }

        if (!data || !data.success) {
          throw new Error(data?.error || 'Erro desconhecido na análise');
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Tentativa ${attempt + 1} falhou:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Falha após múltiplas tentativas');
  };

  const analyzeImages = async (
    images: (File | string)[],
    analysisType: VisionAnalysisType,
    prompt?: string
  ): Promise<VisionAnalysisResult | null> => {
    setIsProcessing(true);

    try {
      console.log('🔍 Iniciando análise Vision AI otimizada:', { 
        analysisType, 
        imagesCount: images.length,
        model: 'gpt-5-mini-2025-08-07'
      });

      // Process and validate files
      const imageDataUrls: string[] = [];
      for (const image of images) {
        if (typeof image === 'string') {
          imageDataUrls.push(image);
        } else {
          // Validate file before processing
          validateFile(image);
          
          const dataUrl = await convertFileToBase64(image);
          imageDataUrls.push(dataUrl);
          
          console.log(`📄 Arquivo processado: ${image.name} (${image.type}, ${(image.size / 1024 / 1024).toFixed(2)}MB)`);
        }
      }

      // Enhanced prompt based on analysis type
      let enhancedPrompt = prompt || '';
      if (analysisType === 'document_ocr' && !prompt) {
        enhancedPrompt = 'Analise este documento com máxima precisão, extraindo todas as informações estruturadas disponíveis, especialmente dados contratuais, equipamentos e serviços.';
      }

      const data = await analyzeWithRetry(imageDataUrls, analysisType, enhancedPrompt);

      console.log('✅ Análise Vision AI concluída com sucesso:', {
        model: data.model,
        processedImages: data.processedImages,
        analysisType: data.analysisType
      });

      toast({
        title: "Análise concluída",
        description: `Documento analisado com sucesso usando ${data.model}.`,
        duration: 3000
      });

      return data;
    } catch (error) {
      console.error('Error in vision analysis:', error);
      
      let errorMessage = "Ocorreu um erro durante a análise. Verifique o arquivo e tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes('Invalid MIME type')) {
          errorMessage = 'Formato de arquivo não suportado. Use imagens (JPG, PNG) ou PDFs.';
        } else if (error.message.includes('too large')) {
          errorMessage = 'Arquivo muito grande. Reduza o tamanho e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro na análise",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromImage = async (image: File | string): Promise<string | null> => {
    console.log('📄 Extraindo texto de imagem...');
    
    const result = await analyzeImages([image], 'document_ocr', 
      'Extraia todo o texto visível nesta imagem. Mantenha a formatação e estrutura original.'
    );
    
    if (result?.success) {
      try {
        const parsed = JSON.parse(result.analysis);
        return parsed.extracted_text || result.analysis;
      } catch {
        return result.analysis;
      }
    }
    return null;
  };

  const analyzeContract = async (image: File | string): Promise<any | null> => {
    console.log('📋 Analisando contrato com Vision/Extract AI...');

    // Se for PDF, preferir LangExtract para texto/estrutura mais confiáveis
    const tryLangExtract = async (pdfBase64: string) => {
      try {
        const base64Data = pdfBase64.replace(/^data:application\/(pdf|octet-stream);base64,/, '');
        const { data, error } = await supabase.functions.invoke('langextract-processor', {
          body: {
            pdfBase64: base64Data,
            extractionType: 'contract',
            filename: 'upload.pdf'
          }
        });
        if (error) throw error;
        if (data?.success) return data.data;
      } catch (e) {
        console.warn('LangExtract falhou, tentando Vision OCR como fallback...', e);
      }
      return null;
    };

    // Se receber string (provavelmente DataURL)
    if (typeof image === 'string') {
      if (image.startsWith('data:application/pdf')) {
        const extracted = await tryLangExtract(image);
        if (extracted) return extracted;
      }
      // Fallback: OCR genérico
      const result = await analyzeImages([image], 'document_ocr');
      if (result?.success) {
        try { return JSON.parse(result.analysis); } catch { return { texto_completo: result.analysis }; }
      }
      return null;
    }

    // Se for um File
    if (image.type === 'application/pdf') {
      // Validar até 50MB
      validateFile(image);
      const dataUrl = await convertFileToBase64(image);
      const extracted = await tryLangExtract(dataUrl);
      if (extracted) return extracted;

      const result = await analyzeImages([dataUrl], 'document_ocr');
      if (result?.success) {
        try { return JSON.parse(result.analysis); } catch { return { texto_completo: result.analysis }; }
      }
      return null;
    }

    // Imagens
    const result = await analyzeImages([image], 'document_ocr');
    if (result?.success) {
      try { return JSON.parse(result.analysis); } catch { return { texto_completo: result.analysis }; }
    }
    return null;
  };

  return {
    analyzeImages,
    extractTextFromImage,
    analyzeContract,
    isProcessing
  };
};
