
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  allowedTypes?: string[];
  maxFiles?: number;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const {
    allowedTypes = [
      'text/plain', 'application/pdf', '.txt', '.md', '.csv', '.pdf',
      'image/jpeg', 'image/png', 'image/tiff', 'image/webp', '.jpg', '.jpeg', '.png', '.tiff', '.webp'
    ],
    maxFiles = 10
  } = options;

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('image/')) {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  };

  const validateFile = (file: File): boolean => {
    // Verificar tipo
    const isValidType = allowedTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type.replace('.', '').toLowerCase())
    );

    if (!isValidType) {
      toast({
        title: "Formato não suportado",
        description: `Por favor, selecione apenas arquivos dos tipos: ${allowedTypes.join(', ')}.`,
        variant: "destructive"
      });
      return false;
    }

    // Verificar se o arquivo não está vazio
    if (file.size === 0) {
      toast({
        title: "Arquivo vazio",
        description: `O arquivo ${file.name} está vazio.`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const processFiles = async (files: FileList | File[]): Promise<UploadedFile[]> => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      toast({
        title: "Muitos arquivos",
        description: `Máximo de ${maxFiles} arquivos permitidos.`,
        variant: "destructive"
      });
      setIsUploading(false);
      return [];
    }

    const validFiles = fileArray.filter(validateFile);
    
    if (validFiles.length === 0) {
      setIsUploading(false);
      return [];
    }

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of validFiles) {
        const content = await readFileContent(file);
        uploadedFiles.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}`,
          name: file.name,
          content,
          size: file.size,
          type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' :
                             file.name.toLowerCase().match(/\.(jpg|jpeg|png|tiff|webp)$/i) ? 'image/' + file.name.split('.').pop() : 'text/plain')
        });
      }

      if (uploadedFiles.length > 0) {
        toast({
          title: "Arquivos processados",
          description: `${uploadedFiles.length} arquivo(s) processado(s) com sucesso.`,
        });
      }

      return uploadedFiles;
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Erro ao processar arquivos",
        description: "Não foi possível processar os arquivos selecionados.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  return {
    processFiles,
    isUploading,
    validateFile,
    readFileContent
  };
};
