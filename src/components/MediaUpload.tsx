import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload, 
  Camera, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Trash2, 
  Eye,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/utils/formatters';

interface MediaFile {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  description?: string;
  created_at: string;
}

interface MediaUploadProps {
  maintenanceId: string;
  onUploadComplete?: () => void;
}

export default function MediaUpload({ maintenanceId, onUploadComplete }: MediaUploadProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_documents')
        .select('*')
        .eq('maintenance_id', maintenanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar arquivos",
        variant: "destructive"
      });
    }
  }, [maintenanceId, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (fileList: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        await uploadFile(file);
        setUploadProgress(((i + 1) / fileList.length) * 100);
      }

      toast({
        title: "Sucesso",
        description: `${fileList.length} arquivo(s) enviado(s) com sucesso`
      });

      loadFiles();
      onUploadComplete?.();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Falha no upload dos arquivos",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadFile = async (file: File) => {
    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
    }

    // Upload para Supabase Storage
    const fileName = `${maintenanceId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('maintenance-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Criar registro no banco
    const { error: dbError } = await supabase
      .from('maintenance_documents')
      .insert({
        maintenance_id: maintenanceId,
        name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        category: getFileCategory(file.type)
      });

    if (dbError) throw dbError;
  };

  const getFileCategory = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.includes('document') || fileType === 'text/plain') return 'document';
    return 'other';
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'image': '#10b981',
      'video': '#3b82f6',
      'pdf': '#ef4444',
      'document': '#f59e0b',
      'other': '#6b7280'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('maintenance-documents')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Falha ao baixar arquivo",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (file: MediaFile) => {
    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('maintenance-documents')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('maintenance_documents')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast({
        title: "Sucesso",
        description: "Arquivo removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover arquivo",
        variant: "destructive"
      });
    }
  };

  const viewFile = async (file: MediaFile) => {
    try {
      // Gerar signed URL com validade de 1 hora
      const { data, error } = await supabase.storage
        .from('maintenance-documents')
        .createSignedUrl(file.file_path, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Não foi possível gerar URL de acesso');
      }

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast({
        title: "Erro",
        description: "Falha ao visualizar arquivo",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Documentos e Mídia
          <Badge variant="outline">{files.length} arquivo(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área de Upload */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="space-y-3">
            <div className="flex justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Suporte para imagens, vídeos, PDFs e documentos
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivos
            </Button>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <Progress value={uploadProgress} className="w-32" />
                <p className="text-sm">Enviando... {Math.round(uploadProgress)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Arquivos */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Arquivos Enviados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.map(file => (
                <Card key={file.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded"
                      style={{ backgroundColor: `${getCategoryColor(file.category)}15` }}
                    >
                      {getFileIcon(file.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: getCategoryColor(file.category) }}
                        >
                          {file.category}
                        </Badge>
                        <span>{formatFileSize(file.file_size)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categorias de arquivos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor('image') }}></div>
            <span>Imagens: {files.filter(f => f.category === 'image').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor('video') }}></div>
            <span>Vídeos: {files.filter(f => f.category === 'video').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor('pdf') }}></div>
            <span>PDFs: {files.filter(f => f.category === 'pdf').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor('document') }}></div>
            <span>Docs: {files.filter(f => f.category === 'document').length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}