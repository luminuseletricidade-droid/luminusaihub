
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSecurity } from '@/components/SecurityProvider';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SecureFileUploadProps {
  onFileUpload: (file: File) => void;
  allowedTypes?: string[];
  accept?: string;
  disabled?: boolean;
}

export const SecureFileUpload: React.FC<SecureFileUploadProps> = ({
  onFileUpload,
  allowedTypes = ['*'],
  accept = "*",
  disabled = false
}) => {
  const { toast } = useToast();
  const { validateFileType } = useSecurity();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    if (rejectedFiles.length > 0) {
      toast({
        title: "Arquivo rejeitado",
        description: "Tipo de arquivo não permitido.",
        variant: "destructive"
      });
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Security validations - only if specific types are required
    if (allowedTypes.length > 0 && !allowedTypes.includes('*') && !validateFileType(file, allowedTypes)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Tipo de arquivo não suportado para esta operação.",
        variant: "destructive"
      });
      return;
    }

    // Additional security check for suspicious file names
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    const fileName = file.name.toLowerCase();
    if (suspiciousPatterns.some(pattern => fileName.includes(pattern))) {
      toast({
        title: "Arquivo suspeito",
        description: "O arquivo foi rejeitado por motivos de segurança.",
        variant: "destructive"
      });
      return;
    }

    onFileUpload(file);
  }, [onFileUpload, allowedTypes, validateFileType, toast]);

  // Create dynamic accept object based on allowedTypes
  const createAcceptObject = () => {
    if (allowedTypes.includes('*')) {
      return undefined; // Accept all file types
    }
    
    const acceptObj: { [key: string]: string[] } = {};
    allowedTypes.forEach(type => {
      if (type === 'application/pdf') acceptObj[type] = ['.pdf'];
      else if (type === 'application/msword') acceptObj[type] = ['.doc'];
      else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') acceptObj[type] = ['.docx'];
      else if (type === 'application/vnd.ms-excel') acceptObj[type] = ['.xls'];
      else if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') acceptObj[type] = ['.xlsx'];
      else if (type === 'text/csv') acceptObj[type] = ['.csv'];
      else if (type === 'application/xml') acceptObj[type] = ['.xml'];
      else if (type === 'text/xml') acceptObj[type] = ['.xml'];
      else if (type === 'image/jpeg') acceptObj[type] = ['.jpg', '.jpeg'];
      else if (type === 'image/jpg') acceptObj[type] = ['.jpg'];
      else if (type === 'image/png') acceptObj[type] = ['.png'];
      else if (type === 'image/gif') acceptObj[type] = ['.gif'];
      else if (type === 'text/plain') acceptObj[type] = ['.txt'];
    });
    return acceptObj;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: createAcceptObject(),
    maxFiles: 1,
    disabled
  });

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {isDragActive ? (
              <Upload className="h-12 w-12 text-primary" />
            ) : (
              <FileText className="h-12 w-12 text-muted-foreground" />
            )}
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground">
                {allowedTypes.includes('*') 
                  ? 'Todos os tipos de arquivo são aceitos (PDF, DOC, DOCX, XLS, CSV, imagens, etc.)'
                  : 'Arquivos aceitos: PDF, DOC, DOCX (sem limite de tamanho)'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span>Apenas arquivos seguros são aceitos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
