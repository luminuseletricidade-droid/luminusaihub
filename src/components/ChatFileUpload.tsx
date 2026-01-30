
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useVisionAI } from '@/hooks/useVisionAI';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Upload, X, FileText, Image, File, Eye, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

interface ChatFileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  maxFiles?: number;
  compact?: boolean;
}

const ChatFileUpload = ({ 
  onFilesUploaded, 
  uploadedFiles, 
  onRemoveFile, 
  maxFiles = 5,
  compact = false 
}: ChatFileUploadProps) => {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isMobile = useIsMobile();
  
  const { processFiles } = useFileUpload({
    allowedTypes: [
      'text/plain', 'application/pdf', '.txt', '.md', '.csv', '.pdf',
      'image/jpeg', 'image/png', 'image/tiff', 'image/webp', 
      '.jpg', '.jpeg', '.png', '.tiff', '.webp'
    ],
    maxFiles
  });

  const { extractTextFromImage } = useVisionAI();

  const handleFileSelect = async (files: FileList) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      toast({
        title: "Muitos arquivos",
        description: `Máximo de ${maxFiles} arquivos permitidos.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const processedFiles = await processFiles(files);
      
      // For images, try to extract text content as well
      const enhancedFiles = await Promise.all(
        processedFiles.map(async (file) => {
          if (file.type.startsWith('image/')) {
            try {
              const extractedText = await extractTextFromImage(file.content);
              if (extractedText) {
                return {
                  ...file,
                  extractedText
                };
              }
            } catch (error) {
              console.log('Could not extract text from image:', error);
            }
          }
          return file;
        })
      );

      onFilesUploaded(enhancedFiles);
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Erro ao processar arquivos",
        description: "Não foi possível processar os arquivos selecionados.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-3 w-3 sm:h-4 sm:w-4" />;
    if (type === 'application/pdf') return <FileText className="h-3 w-3 sm:h-4 sm:w-4" />;
    return <File className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Mobile/Compact version
  if (compact || isMobile) {
    return (
      <div className="space-y-3">
        {/* Upload Button and Counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.tiff,.webp"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
              id="chat-file-input"
              disabled={isProcessing}
            />
            <label htmlFor="chat-file-input">
              <Button 
                variant="outline" 
                size="sm" 
                className="cursor-pointer text-xs sm:text-sm" 
                disabled={isProcessing || uploadedFiles.length >= maxFiles}
                asChild
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  <span className="hidden sm:inline">Anexar</span>
                </span>
              </Button>
            </label>
            {uploadedFiles.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {uploadedFiles.length}/{maxFiles}
              </Badge>
            )}
          </div>
          
          {isProcessing && (
            <span className="text-xs text-muted-foreground">Processando...</span>
          )}
        </div>

        {/* Files Grid - Better for mobile */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {uploadedFiles.map((file) => (
                <Card key={file.id} className="p-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getFileIcon(file.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {file.type.startsWith('image/') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            // Safe image preview without XSS risk
                            const win = window.open();
                            if (win) {
                              win.document.open();
                              win.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Visualizar Imagem</title>
                                    <style>
                                      body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                                      img { max-width: 100%; max-height: 100vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                                    </style>
                                  </head>
                                  <body>
                                    <img src="${file.content.replace(/"/g, '&quot;')}" alt="Imagem" />
                                  </body>
                                </html>
                              `);
                              win.document.close();
                            }
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onRemoveFile(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          PDFs, imagens, documentos • Máx. {maxFiles} arquivos
        </p>
      </div>
    );
  }

  // Desktop full version
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-dashed transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6 text-center">
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.tiff,.webp"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
            disabled={isProcessing}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="space-y-2">
              {isProcessing ? (
                <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isProcessing 
                    ? 'Processando arquivos...' 
                    : 'Arraste arquivos aqui ou clique para selecionar'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  PDFs, imagens, documentos de texto • Máximo {maxFiles} arquivos
                </p>
              </div>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Arquivos Enviados ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type.startsWith('image/') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Safe image preview without XSS risk
                          const win = window.open();
                          if (win) {
                            win.document.open();
                            win.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Visualizar Imagem</title>
                                  <style>
                                    body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                                    img { max-width: 100%; max-height: 100vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                                  </style>
                                </head>
                                <body>
                                  <img src="${file.content.replace(/"/g, '&quot;')}" alt="Imagem" />
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatFileUpload;
