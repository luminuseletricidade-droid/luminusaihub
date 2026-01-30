/**
 * AddendumDetailsModal Component
 * Modal for viewing AI analysis summary from a document with actionable changes
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Sparkles,
  Loader2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Wrench,
  Settings,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';
import { ContractAddendum } from '@/types';

// Tradução de tipos de mudança
const CHANGE_TYPE_LABELS: Record<string, string> = {
  'date_change': 'Alteração de Data',
  'value_change': 'Alteração de Valor',
  'service_add': 'Adição de Serviço',
  'service_remove': 'Remoção de Serviço',
  'maintenance_add': 'Adição de Manutenção',
  'maintenance_schedule': 'Cronograma de Manutenção',
  'equipment_update': 'Atualização de Equipamento',
  'condition_change': 'Alteração de Condições',
  'renewal': 'Renovação',
  'extension': 'Prorrogação',
  'amendment': 'Aditamento',
  'other': 'Outra Alteração'
};

// Tradução de campos
const FIELD_NAME_LABELS: Record<string, string> = {
  'end_date': 'Data de Término',
  'start_date': 'Data de Início',
  'value': 'Valor',
  'monthly_value': 'Valor Mensal',
  'total_value': 'Valor Total',
  'contract_term': 'Vigência',
  'maintenance_schedule': 'Cronograma de Manutenção',
  'equipment': 'Equipamentos',
  'services': 'Serviços',
  'conditions': 'Condições',
  'parties': 'Partes',
  'scope': 'Escopo',
  'payment_terms': 'Condições de Pagamento'
};

// Ícones por tipo de mudança
const getChangeTypeIcon = (type: string) => {
  switch (type) {
    case 'date_change':
    case 'renewal':
    case 'extension':
      return <Calendar className="h-4 w-4" />;
    case 'value_change':
      return <DollarSign className="h-4 w-4" />;
    case 'service_add':
    case 'service_remove':
      return <Wrench className="h-4 w-4" />;
    case 'maintenance_add':
    case 'maintenance_schedule':
      return <Settings className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

// Traduz o tipo de mudança
const translateChangeType = (type: string): string => {
  return CHANGE_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Traduz o nome do campo
const translateFieldName = (field: string): string => {
  return FIELD_NAME_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface DetectedChange {
  type: string;
  field_name?: string;
  description?: string;
  change_description?: string;
  suggested_value?: string;
  confidence_score?: number;
}

interface AddendumDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  addendum: ContractAddendum | null;
  onOpenInsights?: () => void;
  onApplyChange?: (change: DetectedChange) => Promise<boolean>;
}

export const AddendumDetailsModal: React.FC<AddendumDetailsModalProps> = ({
  isOpen,
  onClose,
  addendum,
  onOpenInsights,
  onApplyChange,
}) => {
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  if (!addendum) return null;

  const insights = addendum.extracted_insights;
  const isProcessing = ['uploading', 'extracting', 'validating', 'analyzing', 'processing'].includes(addendum.processing_status || '');
  const hasError = addendum.processing_status === 'error';
  const isAnalyzed = addendum.status === 'analyzed';
  const isApplied = addendum.status === 'applied';

  const handleApplyChange = async (change: DetectedChange, index: number) => {
    if (!onApplyChange) return;
    setApplyingIndex(index);
    try {
      await onApplyChange(change);
    } finally {
      setApplyingIndex(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {addendum.title || addendum.file_name}
          </DialogTitle>
          <DialogDescription>
            Resumo gerado por IA do conteúdo do documento
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise da IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm font-medium">Processando documento...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA está analisando o conteúdo
                  </p>
                </div>
              ) : hasError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
                  <p className="text-sm font-medium text-destructive">Erro no processamento</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {addendum.processing_error || 'Não foi possível processar o documento'}
                  </p>
                </div>
              ) : insights?.summary ? (
                <>
                  {/* Summary */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 font-medium">Resumo</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-4 leading-relaxed">
                      {insights.summary}
                    </p>
                  </div>

                  {/* Detected Changes */}
                  {insights.detected_changes && insights.detected_changes.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3 font-medium">
                        Alterações Identificadas ({insights.detected_changes.length})
                      </p>
                      <div className="space-y-3">
                        {insights.detected_changes.map((change: DetectedChange, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 text-sm p-4 bg-muted/30 rounded-lg border border-muted hover:border-primary/30 transition-colors"
                          >
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                              {getChangeTypeIcon(change.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {translateChangeType(change.type)}
                                </Badge>
                                {change.field_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {translateFieldName(change.field_name)}
                                  </Badge>
                                )}
                                {change.confidence_score && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      change.confidence_score >= 0.8
                                        ? 'border-green-500 text-green-700 bg-green-50'
                                        : change.confidence_score >= 0.5
                                        ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                        : 'border-red-500 text-red-700 bg-red-50'
                                    }`}
                                  >
                                    {Math.round(change.confidence_score * 100)}% confiança
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground leading-relaxed">
                                {change.description || change.change_description}
                              </p>
                              {change.suggested_value && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-primary/5 rounded-md">
                                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-xs text-muted-foreground">Novo valor:</span>
                                  <span className="text-sm font-semibold text-primary">{change.suggested_value}</span>
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            {onApplyChange && !isApplied && (
                              <div className="shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApplyChange(change, index)}
                                  disabled={applyingIndex === index}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                >
                                  {applyingIndex === index ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aplicar
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Análise não disponível</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O documento ainda não foi processado pela IA
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {isApplied ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Alterações aplicadas ao contrato
              </span>
            ) : isAnalyzed && insights?.detected_changes?.length > 0 ? (
              <span>{insights.detected_changes.length} alteração(ões) disponível(is) para aplicar</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {onOpenInsights && isAnalyzed && !isApplied && (
              <Button onClick={onOpenInsights}>
                <Play className="h-4 w-4 mr-2" />
                Revisar e Aplicar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddendumDetailsModal;
