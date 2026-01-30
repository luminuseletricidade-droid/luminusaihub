
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, X, Upload, Eye, EyeOff } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ChatFileContextProps {
  currentFile?: {
    name: string;
    size: number;
    content: string;
    type: string;
  };
  onFileRemove: () => void;
  onFileReplace: (file: File) => void;
  isEnabled: boolean;
  onToggleContext: (enabled: boolean) => void;
}

export const ChatFileContext = ({ 
  currentFile, 
  onFileRemove, 
  onFileReplace, 
  isEnabled, 
  onToggleContext 
}: ChatFileContextProps) => {
  const [isReplacing, setIsReplacing] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileReplace(acceptedFiles[0]);
        setIsReplacing(false);
      }
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!currentFile) {
    return (
      <Card className="mb-4 border-dashed border-2">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum arquivo em contexto. Faça upload de um PDF para análise.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isReplacing) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? 'Solte o arquivo aqui' : 'Clique ou arraste um novo arquivo PDF'}
            </p>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsReplacing(false)}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(currentFile.size)} • PDF
              </p>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"} className="ml-2">
              {isEnabled ? "Em contexto" : "Pausado"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleContext(!isEnabled)}
              title={isEnabled ? "Pausar contexto" : "Ativar contexto"}
            >
              {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplacing(true)}
              title="Trocar arquivo"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              title="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
