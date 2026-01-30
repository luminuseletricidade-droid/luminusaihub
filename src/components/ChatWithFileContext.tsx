
import { useState, useEffect } from 'react';
import { ModernContractChat } from './ModernContractChat';
import { ChatFileContext } from './ChatFileContext';
import { useChatFileContext } from '@/hooks/useChatFileContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { ExtendedContract, ContractChatContext } from '@/types';

interface ChatWithFileContextProps {
  initialFile?: File;
  extractedData?: Record<string, unknown>;
  contractContext?: ExtendedContract;
  onBack: () => void;
  onClose?: () => void;
}

export const ChatWithFileContext = ({ 
  initialFile, 
  extractedData, 
  contractContext, 
  onBack,
  onClose 
}: ChatWithFileContextProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const {
    currentFile,
    isContextEnabled,
    setFile,
    removeFile,
    replaceFile,
    toggleContext,
    getContextForChat
  } = useChatFileContext();

  // Set initial file if provided
  useEffect(() => {
    if (initialFile && !currentFile) {
      setFile(initialFile);
    }
  }, [initialFile, currentFile, setFile]);

  // Create enriched contract context for chat
  const enrichedContractContext: ContractChatContext = {
    ...contractContext,
    extractedData,
    fileContext: getContextForChat()
  };

  const handleBack = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      onBack();
    }
  };

  return (
    <div className={`flex flex-col h-full ${isMaximized ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            Chat IA - Análise de Documento
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      {/* File Context */}
      <div className="p-4">
        <ChatFileContext
          currentFile={currentFile}
          onFileRemove={removeFile}
          onFileReplace={replaceFile}
          isEnabled={isContextEnabled}
          onToggleContext={toggleContext}
        />
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ModernContractChat
          contract={enrichedContractContext}
          onBack={() => {}} // Don't use ModernContractChat's onBack
          showHeader={false} // Don't show duplicate header
          fileContext={getContextForChat()}
        />
      </div>
    </div>
  );
};
