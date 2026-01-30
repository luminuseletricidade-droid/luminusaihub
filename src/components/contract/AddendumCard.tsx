/**
 * AddendumCard Component
 * Displays a single contract addendum with actions
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Eye,
  Lightbulb,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  Upload,
  FileSearch,
  ShieldCheck,
  Brain
} from 'lucide-react';
import { ContractAddendum } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddendumCardProps {
  addendum: ContractAddendum;
  onViewPDF?: () => void;
  onViewDetails?: () => void;
  onViewInsights?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

// Processing step configuration for display
const PROCESSING_STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  uploading: { label: 'Enviando...', icon: Upload, color: 'bg-blue-100 text-blue-800' },
  extracting: { label: 'Extraindo OCR...', icon: FileSearch, color: 'bg-purple-100 text-purple-800' },
  validating: { label: 'Validando...', icon: ShieldCheck, color: 'bg-orange-100 text-orange-800' },
  analyzing: { label: 'Analisando IA...', icon: Brain, color: 'bg-indigo-100 text-indigo-800' },
  processing: { label: 'Processando...', icon: Loader2, color: 'bg-blue-100 text-blue-800' }, // Legacy
};

const getStatusBadge = (addendum: ContractAddendum) => {
  const { processing_status, status } = addendum;

  // Check if actively processing (any non-completed, non-error status)
  const processingConfig = PROCESSING_STEP_CONFIG[processing_status || ''];
  if (processingConfig && processing_status !== 'completed') {
    const IconComponent = processingConfig.icon;
    return (
      <Badge variant="secondary" className={`${processingConfig.color} flex items-center gap-1.5 animate-pulse`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {processingConfig.label}
      </Badge>
    );
  }

  if (processing_status === 'error') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Erro
      </Badge>
    );
  }

  // Workflow status (after processing is completed)
  switch (status) {
    case 'analyzed':
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center gap-1">
          <Lightbulb className="h-3 w-3" />
          Analisado
        </Badge>
      );
    case 'applied':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Aplicado
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          Rejeitado
        </Badge>
      );
    default:
      // If completed processing but no workflow status yet, show completed
      if (processing_status === 'completed') {
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Processado
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Enviado
        </Badge>
      );
  }
};

const getChangesCount = (addendum: ContractAddendum): number => {
  return addendum.extracted_insights?.detected_changes?.length || 0;
};

export const AddendumCard: React.FC<AddendumCardProps> = ({
  addendum,
  onViewPDF,
  onViewDetails,
  onViewInsights,
  onDelete,
  isDeleting = false
}) => {
  const changesCount = getChangesCount(addendum);
  // Only show insights button when analyzed and has pending changes (not after applied)
  const hasInsights = addendum.status === 'analyzed' && changesCount > 0;
  const hasExtractedContent = Boolean(addendum.content_extracted);

  // Check if actively processing (any status that isn't completed or error)
  const activeProcessingStatuses = ['uploading', 'extracting', 'validating', 'analyzing', 'processing'];
  const isProcessing = activeProcessingStatuses.includes(addendum.processing_status || '');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon and Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">
                  {addendum.title || `Anexo ${addendum.addendum_number}`}
                </h4>
                {getStatusBadge(addendum)}
              </div>

              <p className="text-sm text-muted-foreground truncate mt-1">
                {addendum.file_name}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  {addendum.created_at && format(
                    new Date(addendum.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </span>
                {changesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    {changesCount} alteração{changesCount > 1 ? 'ões' : ''}
                  </span>
                )}
              </div>

              {addendum.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {addendum.description}
                </p>
              )}

              {addendum.processing_error && (
                <p className="text-sm text-destructive mt-2">
                  Erro: {addendum.processing_error}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {onViewPDF && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewPDF}
                disabled={isProcessing}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver Anexo
              </Button>
            )}

            {onViewDetails && hasExtractedContent && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
              >
                <Info className="h-4 w-4 mr-1" />
                Ver Detalhes
              </Button>
            )}

            {onViewInsights && hasInsights && (
              <Button
                variant="default"
                size="sm"
                onClick={onViewInsights}
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                Insights
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive border-destructive/50 hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddendumCard;
