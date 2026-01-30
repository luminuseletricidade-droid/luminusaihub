
import { useState, useCallback } from 'react';

interface FileContext {
  name: string;
  size: number;
  content: string;
  type: string;
}

export const useChatFileContext = () => {
  const [currentFile, setCurrentFile] = useState<FileContext | null>(null);
  const [isContextEnabled, setIsContextEnabled] = useState(true);

  const setFile = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCurrentFile({
          name: file.name,
          size: file.size,
          content: base64,
          type: file.type
        });
        setIsContextEnabled(true);
        resolve();
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback(() => {
    setCurrentFile(null);
    setIsContextEnabled(false);
  }, []);

  const replaceFile = useCallback(async (newFile: File) => {
    await setFile(newFile);
  }, [setFile]);

  const toggleContext = useCallback((enabled: boolean) => {
    setIsContextEnabled(enabled);
  }, []);

  const getContextForChat = useCallback(() => {
    return {
      file: currentFile,
      enabled: isContextEnabled && currentFile !== null
    };
  }, [currentFile, isContextEnabled]);

  return {
    currentFile,
    isContextEnabled,
    setFile,
    removeFile,
    replaceFile,
    toggleContext,
    getContextForChat
  };
};
