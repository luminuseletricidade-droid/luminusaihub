import { useState } from 'react';
import { supabase, CONTRACT_DOCUMENTS_BUCKET } from '@/integrations/supabase/client';
import { useLangExtractAI } from './useLangExtractAI';

export interface PdfReadResult {
  file: File;
  base64: string;
}

// Hook centralizado para leitura de PDFs
export const usePdfReader = () => {
  const { extractContractData, isProcessing } = useLangExtractAI() as unknown;
  const [isLoading, setIsLoading] = useState(false);

  // Converte Blob para File
  const blobToFile = (blob: Blob, fileName: string, type?: string): File => {
    return new File([blob], fileName, { type: type || blob.type || 'application/pdf' });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Lê PDF do Storage a partir do caminho
  const readPdfFromStorage = async (filePath: string, fileName?: string): Promise<PdfReadResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(CONTRACT_DOCUMENTS_BUCKET)
        .download(filePath);

      if (error || !data) throw error || new Error('Falha no download do PDF');

      const file = blobToFile(data, fileName || filePath.split('/').pop() || 'documento.pdf', 'application/pdf');
      const base64 = await fileToBase64(file);
      return { file, base64 };
    } finally {
      setIsLoading(false);
    }
  };

  // Busca o PDF mais recente do contrato e retorna File + base64
  const readLatestContractPdf = async (contractId: string): Promise<PdfReadResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_documents')
        .select('file_path,name,file_type')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return await readPdfFromStorage(data.file_path, data.name);
    } finally {
      setIsLoading(false);
    }
  };

  // Retorna apenas a referência ao PDF mais recente (sem baixar)
  const readLatestContractPdfRef = async (contractId: string): Promise<{ path: string; name: string; size?: number } | null> => {
    const { data, error } = await supabase
      .from('contract_documents')
      .select('file_path,name,file_size')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { path: data.file_path, name: data.name, size: data.file_size };
  };

  // Extração de dados contratuais a partir de um File
  const extractContractFromFile = async (file: File) => {
    return await extractContractData(file);
  };

  // Lê um arquivo ou caminho e retorna o texto extraído via LangExtract
  const readAndExtract = async (fileOrPath: File | string): Promise<string> => {
    let file: File;

    // Determina se é caminho ou File
    if (typeof fileOrPath === 'string') {
      const result = await readPdfFromStorage(fileOrPath);
      file = result.file;
    } else {
      file = fileOrPath;
    }

    // Converte para base64 removendo prefixo
    const base64 = await fileToBase64(file);
    const payload = base64.replace(/^data:application\/pdf;base64,/, '');

    const { data, error } = await supabase.functions.invoke('langextract-processor', {
      body: {
        pdfBase64: payload,
        extractionType: 'general',
        filename: file.name
      }
    });

    if (error || !data?.success) {
      throw error || new Error(data?.error || 'Falha na extração do PDF');
    }

    return data.data?.content || data.data?.texto_extraido || '';
  };

  return {
    isLoading: isLoading || isProcessing,
    readPdfFromStorage,
    readLatestContractPdf,
    readLatestContractPdfRef,
    extractContractFromFile,
    readAndExtract,
  };
};
