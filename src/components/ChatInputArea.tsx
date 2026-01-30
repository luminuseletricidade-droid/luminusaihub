
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ChatFileUpload from './ChatFileUpload';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface ChatInputAreaProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  currentSessionId: string;
  uploadedFiles: UploadedFile[];
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  onFilesUploaded: (files: UploadedFile[]) => void;
  onRemoveFile: (fileId: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  onKeyPress,
  isLoading,
  currentSessionId,
  uploadedFiles,
  showFileUpload,
  setShowFileUpload,
  onFilesUploaded,
  onRemoveFile,
  inputRef
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="p-4 sm:p-6 border-t border-border/60 bg-card/95 backdrop-blur-sm">
      <div className="max-w-full sm:max-w-4xl mx-auto space-y-3">
        {/* File Upload Area - Above input on mobile */}
        {showFileUpload && (
          <div className="p-3 border border-border/40 rounded-lg bg-card/50">
            <ChatFileUpload
              onFilesUploaded={onFilesUploaded}
              uploadedFiles={uploadedFiles}
              onRemoveFile={onRemoveFile}
              maxFiles={3}
              compact={true}
            />
          </div>
        )}

        {/* Uploaded Files Display - Horizontal scroll on mobile */}
        {uploadedFiles.length > 0 && !showFileUpload && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {uploadedFiles.map((file) => (
              <Badge key={file.id} variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">
                <span className="max-w-20 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="Digite sua mensagem..."
              disabled={isLoading || !currentSessionId}
              className="min-h-[60px] max-h-[200px] resize-none border-border/40 bg-background/50 focus:bg-background transition-colors text-sm sm:text-base pr-12"
              rows={1}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="absolute right-2 bottom-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isLoading || !currentSessionId}
            className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 flex-shrink-0 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-center">
          Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> para enviar • 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> para quebra de linha
        </div>
      </div>
    </div>
  );
};
