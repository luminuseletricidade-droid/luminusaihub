import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DocumentAnalysisResult {
  success: boolean;
  content?: string;
  analysis?: unknown;
  error?: string;
  method?: string;
}

export const useDocumentIntelligence = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const analyzeDocumentWithAI = async (
    documentContent: string | File,
    prompt?: string,
    maxRetries: number = 3
  ): Promise<DocumentAnalysisResult> => {
    setIsAnalyzing(true);
    setRetryCount(0);

    let lastError: Error | null = null;
    let base64Content: string = '';

    try {
      // Convert to base64 if needed
      if (documentContent instanceof File) {
        base64Content = await fileToBase64(documentContent);
      } else if (typeof documentContent === 'string') {
        if (documentContent.startsWith('data:')) {
          base64Content = documentContent.split(',')[1];
        } else {
          // Use encodeURIComponent to handle UTF-8 characters
          base64Content = btoa(unescape(encodeURIComponent(documentContent)));
        }
      }

      // Try multiple extraction methods with retry logic
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        setRetryCount(attempt + 1);

        // Method 1: Local backend API (most reliable and fast)
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

          // Convert base64 to blob if needed
          const base64Data = base64Content.split(',')[1] || base64Content;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          // Create FormData with the file
          const formData = new FormData();
          formData.append('file', blob, 'document.pdf');

          const response = await fetch(`${apiUrl}/api/extract-text`, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.text) {
              // If prompt provided, analyze the extracted content
              if (prompt) {
                return await analyzeExtractedContent(data.text, prompt);
              }

              return {
                success: true,
                content: data.text,
                method: 'backend-api'
              };
            }
          }
        } catch (err) {
          console.log(`Backend API attempt ${attempt + 1} failed:`, err);
          lastError = err as Error;
        }

        // Skip problematic Supabase endpoints that return 500 errors
        // Method 2: Smart chat for general analysis (if prompt is provided)

        // Method 3: Smart chat for general analysis
        if (prompt) {
          try {
            const { data, error } = await supabase.functions.invoke('smart-chat', {
              body: {
                message: prompt,
                context: {
                  hasDocument: true,
                  documentType: documentContent instanceof File ? documentContent.type : 'text/plain'
                },
                documentContent: base64Content
              }
            });

            if (!error && data?.response) {
              return {
                success: true,
                content: data.response,
                analysis: data,
                method: 'smart-chat'
              };
            }
          } catch (err) {
            console.log(`Smart chat attempt ${attempt + 1} failed:`, err);
            lastError = err as Error;
          }
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      throw lastError || new Error('Todos os métodos de análise falharam');

    } catch (error) {
      console.error('Document intelligence analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao analisar documento'
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeExtractedContent = async (
    content: string,
    prompt: string
  ): Promise<DocumentAnalysisResult> => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-chat', {
        body: {
          message: `${prompt}\n\nConteúdo do documento:\n${content}`,
          context: {
            isDocumentAnalysis: true
          }
        }
      });

      if (error) throw error;

      return {
        success: true,
        content: content,
        analysis: data.response,
        method: 'smart-chat-analysis'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao analisar conteúdo'
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    const result = await analyzeDocumentWithAI(pdfFile);
    if (result.success) {
      return result.content || '';
    }
    throw new Error(result.error || 'Falha ao extrair texto do PDF');
  };

  const analyzeDocument = async (
    document: File | string,
    analysisPrompt: string
  ): Promise<DocumentAnalysisResult> => {
    return analyzeDocumentWithAI(document, analysisPrompt);
  };

  return {
    isAnalyzing,
    retryCount,
    analyzeDocumentWithAI,
    extractTextFromPDF,
    analyzeDocument,
    analyzeExtractedContent
  };
};