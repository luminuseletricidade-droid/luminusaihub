/**
 * ContractAddendums Component
 * Main section for managing contract addendums within the contract data tab
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Plus,
  Loader2,
  FileUp,
  X,
  CheckCircle,
  AlertCircle,
  FileSearch,
  ShieldCheck,
  Brain,
  Check
} from 'lucide-react';
import { ProcessingStep } from '@/hooks/useContractAddendums';
import { useContractAddendums } from '@/hooks/useContractAddendums';
import { AddendumCard } from './AddendumCard';
import { AddendumInsightsModal } from './AddendumInsightsModal';
import { AddendumDetailsModal } from './AddendumDetailsModal';
import { PDFPreviewDialog } from '@/components/PDFPreviewDialog';
import { API_BASE_URL } from '@/config/api.config';
import { ContractAddendum } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Supported file formats configuration
const SUPPORTED_FORMATS = {
  // Documents
  'application/pdf': { ext: '.pdf', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', label: 'Word' },
  'application/msword': { ext: '.doc', label: 'Word' },
  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', label: 'Excel' },
  'application/vnd.ms-excel': { ext: '.xls', label: 'Excel' },
  'text/csv': { ext: '.csv', label: 'CSV' },
  // Images
  'image/png': { ext: '.png', label: 'Imagem' },
  'image/jpeg': { ext: '.jpg', label: 'Imagem' },
  'image/gif': { ext: '.gif', label: 'Imagem' },
  'image/webp': { ext: '.webp', label: 'Imagem' },
  'image/bmp': { ext: '.bmp', label: 'Imagem' },
  // Text
  'text/plain': { ext: '.txt', label: 'Texto' },
  'application/json': { ext: '.json', label: 'JSON' },
};

// Generate accept string for file input
const ACCEPT_STRING = Object.entries(SUPPORTED_FORMATS)
  .map(([mime, { ext }]) => `${ext},${mime}`)
  .join(',');

// Check if a file type is supported
const isFileTypeSupported = (mimeType: string, fileName: string): boolean => {
  // Check MIME type
  if (SUPPORTED_FORMATS[mimeType as keyof typeof SUPPORTED_FORMATS]) {
    return true;
  }
  // Also check file extension as fallback
  const ext = fileName.toLowerCase().split('.').pop();
  const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.txt', '.json'];
  return supportedExts.some(supported => supported === `.${ext}`);
};

interface ContractAddendumsProps {
  contractId: string;
  onContractUpdate?: () => void;
}

// Processing steps configuration
const PROCESSING_STEPS = [
  { id: 'uploading', label: 'Upload', icon: Upload, description: 'Enviando arquivo' },
  { id: 'extracting', label: 'OCR', icon: FileSearch, description: 'Extraindo texto' },
  { id: 'validating', label: 'Validação', icon: ShieldCheck, description: 'Verificando documento' },
  { id: 'analyzing', label: 'Análise IA', icon: Brain, description: 'Identificando alterações' },
  { id: 'completed', label: 'Concluído', icon: Check, description: 'Pronto para revisão' }
] as const;

// Get step index for progress calculation
const getStepIndex = (step: ProcessingStep): number => {
  const index = PROCESSING_STEPS.findIndex(s => s.id === step);
  return index >= 0 ? index : 0;
};

// Helper to get processing step display info
const getProcessingStepInfo = (step: ProcessingStep): { message: string; subMessage?: string } => {
  switch (step) {
    case 'uploading':
      return { message: 'Enviando arquivo...', subMessage: 'Fazendo upload do documento' };
    case 'extracting':
      return { message: 'Extraindo texto...', subMessage: 'OCR e extração de conteúdo' };
    case 'validating':
      return { message: 'Validando documento...', subMessage: 'Verificando identidade do contrato' };
    case 'analyzing':
      return { message: 'Analisando com IA...', subMessage: 'Identificando alterações contratuais' };
    case 'completed':
      return { message: 'Processamento concluído!', subMessage: 'Anexo pronto para revisão' };
    case 'error':
      return { message: 'Erro no processamento', subMessage: 'Verifique os detalhes do anexo' };
    default:
      return { message: 'Processando...', subMessage: '' };
  }
};

// Calculate progress percentage based on current step
const getStepProgress = (step: ProcessingStep): number => {
  switch (step) {
    case 'uploading': return 10;
    case 'extracting': return 35;
    case 'validating': return 60;
    case 'analyzing': return 85;
    case 'completed': return 100;
    case 'error': return 0;
    default: return 0;
  }
};

// Processing Stepper Component
const ProcessingStepper: React.FC<{ currentStep: ProcessingStep }> = ({
  currentStep
}) => {
  const currentIndex = getStepIndex(currentStep);
  const isError = currentStep === 'error';
  const progress = getStepProgress(currentStep);

  return (
    <div className="w-full max-w-md mx-auto py-4">
      {/* Steps */}
      <div className="flex items-center justify-between mb-4">
        {PROCESSING_STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex || currentStep === 'completed';
          const isPending = index > currentIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isError && isActive ? 'bg-destructive text-destructive-foreground' : ''}
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isActive && !isError ? 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2' : ''}
                    ${isPending ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isActive ? (
                    isError ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                {/* Step Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors
                    ${isActive ? 'text-primary' : ''}
                    ${isCompleted ? 'text-primary' : ''}
                    ${isPending ? 'text-muted-foreground' : ''}
                    ${isError && isActive ? 'text-destructive' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < PROCESSING_STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 -mt-6">
                  <div
                    className={`
                      h-full rounded transition-all duration-500
                      ${index < currentIndex ? 'bg-primary' : 'bg-muted'}
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="text-center mt-4">
        <p className="text-sm font-medium">{getProcessingStepInfo(currentStep).message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {getProcessingStepInfo(currentStep).subMessage}
        </p>
      </div>

      {/* Progress Bar */}
      {currentStep !== 'completed' && currentStep !== 'error' && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-1">{progress}%</p>
        </div>
      )}
    </div>
  );
};

export const ContractAddendums: React.FC<ContractAddendumsProps> = ({
  contractId,
  onContractUpdate
}) => {
  const {
    addendums,
    pendingChanges,
    isLoading,
    isUploading,
    uploadProgress,
    isProcessing,
    processingStep,
    selectedAddendum,
    loadAddendums,
    uploadAddendum,
    deleteAddendum,
    loadPendingChanges,
    approveChange,
    rejectChange,
    applyAllApproved,
    setSelectedAddendum,
    refreshAddendum
  } = useContractAddendums(contractId);

  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Insights modal state
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);

  // Details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsAddendum, setDetailsAddendum] = useState<ContractAddendum | null>(null);

  // PDF preview state
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [previewPDFUrl, setPreviewPDFUrl] = useState('');
  const [previewDocumentName, setPreviewDocumentName] = useState('');

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isFileTypeSupported(file.type, file.name)) {
        setUploadFile(file);
        setIsUploadDialogOpen(true);
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFile(files[0]);
    }
  }, []);

  // Upload handler - closes dialog immediately and shows progress in main area
  const handleUpload = async () => {
    if (!uploadFile) return;

    // Store file reference before clearing state
    const fileToUpload = uploadFile;
    const titleToUse = uploadTitle || undefined;
    const descriptionToUse = uploadDescription || undefined;

    // Close dialog immediately for better UX
    setIsUploadDialogOpen(false);
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');

    // Start upload in background - progress will show in main area
    await uploadAddendum(fileToUpload, titleToUse, descriptionToUse);
  };

  // View insights handler
  const handleViewInsights = async (addendum: ContractAddendum) => {
    setSelectedAddendum(addendum);
    await loadPendingChanges(addendum.id);
    setIsInsightsModalOpen(true);
  };

  // View details handler
  const handleViewDetails = (addendum: ContractAddendum) => {
    setDetailsAddendum(addendum);
    setIsDetailsModalOpen(true);
  };

  // View PDF handler - uses signed URL for secure access
  const handleViewPDF = async (addendum: ContractAddendum) => {
    if (!addendum.file_path) {
      console.error('No file path available for addendum');
      return;
    }

    try {
      // Generate signed URL with 1 hour validity (same pattern as ContractDocumentsWithAgents)
      const { data, error } = await supabase.storage
        .from('contract-documents')
        .createSignedUrl(addendum.file_path, 3600);

      if (error || !data?.signedUrl) {
        throw error || new Error('Não foi possível gerar URL de acesso');
      }

      setPreviewPDFUrl(data.signedUrl);
      setPreviewDocumentName(addendum.file_name || 'Anexo');
      setIsPDFPreviewOpen(true);
    } catch (error) {
      console.error('Error opening PDF preview:', error);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    const success = await deleteAddendum(deleteConfirmId);
    setIsDeleting(false);
    setDeleteConfirmId(null);

    if (success && onContractUpdate) {
      onContractUpdate();
    }
  };

  // Apply changes handler
  const handleApplyAll = async () => {
    if (!selectedAddendum) return false;

    const success = await applyAllApproved(selectedAddendum.id);

    if (success) {
      // Refresh the addendum to get updated status
      await refreshAddendum(selectedAddendum.id);

      // Notify parent to refresh contract data
      if (onContractUpdate) {
        onContractUpdate();
      }
    }

    return success;
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anexos do Contrato
          </CardTitle>
          <CardDescription>
            Faca upload de anexos contratuais para extrair e aplicar alteracoes automaticamente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && setIsUploadDialogOpen(true)}
          >
            {isUploading || isProcessing ? (
              <ProcessingStepper currentStep={processingStep} />
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo ou clique para fazer upload
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PDF, Word, Excel, CSV, imagens (PNG, JPG) e mais
                </p>
              </>
            )}
          </div>

          {/* Addendums List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : addendums.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {addendums.length} anexo{addendums.length > 1 ? 's' : ''} encontrado{addendums.length > 1 ? 's' : ''}
              </h4>
              {addendums.map((addendum) => (
                <AddendumCard
                  key={addendum.id}
                  addendum={addendum}
                  onViewPDF={() => handleViewPDF(addendum)}
                  onViewDetails={() => handleViewDetails(addendum)}
                  onViewInsights={() => handleViewInsights(addendum)}
                  onDelete={() => setDeleteConfirmId(addendum.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum anexo cadastrado para este contrato
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Upload de Anexo</DialogTitle>
            <DialogDescription className="text-sm">
              Selecione um arquivo para processar. Formatos suportados: PDF, Word, Excel, CSV, imagens e texto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 sm:py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Arquivo</Label>
              {uploadFile ? (
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg min-w-0">
                  <FileUp className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="flex-1 text-sm truncate min-w-0" title={uploadFile.name}>
                    {uploadFile.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-8 w-8 p-0"
                    onClick={() => setUploadFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept={ACCEPT_STRING}
                    onChange={handleFileSelect}
                    className="cursor-pointer text-sm"
                  />
                </div>
              )}
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="addendum-title">Titulo (opcional)</Label>
              <Input
                id="addendum-title"
                placeholder="Ex: Anexo de Prorrogacao"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="addendum-description">Descricao (opcional)</Label>
              <Input
                id="addendum-description"
                placeholder="Breve descricao do anexo"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setUploadFile(null);
                setUploadTitle('');
                setUploadDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Enviar Anexo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insights Modal */}
      <AddendumInsightsModal
        isOpen={isInsightsModalOpen}
        onClose={() => {
          setIsInsightsModalOpen(false);
          setSelectedAddendum(null);
        }}
        addendum={selectedAddendum}
        pendingChanges={pendingChanges}
        onApproveChange={approveChange}
        onRejectChange={rejectChange}
        onApplyAll={handleApplyAll}
      />

      {/* Details Modal */}
      <AddendumDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsAddendum(null);
        }}
        addendum={detailsAddendum}
        onOpenInsights={() => {
          // Close details modal and open insights modal
          setIsDetailsModalOpen(false);
          if (detailsAddendum) {
            handleViewInsights(detailsAddendum);
          }
        }}
      />

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        isOpen={isPDFPreviewOpen}
        onClose={() => setIsPDFPreviewOpen(false)}
        pdfUrl={previewPDFUrl}
        documentName={previewDocumentName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O anexo e todas as alteracoes pendentes
              associadas serao excluidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContractAddendums;
