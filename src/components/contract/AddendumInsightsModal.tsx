/**
 * AddendumInsightsModal Component
 * Modal for viewing extracted insights and managing pending changes
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  DollarSign,
  Wrench,
  FileText,
  Settings,
  ArrowRight,
  AlertCircle,
  Check,
  X,
  Play
} from 'lucide-react';
import { ContractAddendum, PendingContractChange } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddendumInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  addendum: ContractAddendum | null;
  pendingChanges: PendingContractChange[];
  onApproveChange: (changeId: string) => Promise<boolean>;
  onRejectChange: (changeId: string, reason?: string) => Promise<boolean>;
  onApplyAll: () => Promise<boolean>;
  isLoading?: boolean;
}

const getChangeTypeIcon = (type: string) => {
  switch (type) {
    case 'date_change':
      return <Calendar className="h-4 w-4" />;
    case 'value_change':
      return <DollarSign className="h-4 w-4" />;
    case 'service_add':
    case 'service_remove':
      return <Wrench className="h-4 w-4" />;
    case 'maintenance_add':
      return <Settings className="h-4 w-4" />;
    case 'equipment_update':
      return <Settings className="h-4 w-4" />;
    case 'condition_change':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

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

const getChangeTypeLabel = (type: string) => {
  return CHANGE_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getFieldNameLabel = (field: string) => {
  return FIELD_NAME_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Check className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <X className="h-3 w-3 mr-1" />
          Rejeitado
        </Badge>
      );
    case 'applied':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aplicado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Pendente
        </Badge>
      );
  }
};

const getConfidenceBadge = (score: number | undefined) => {
  if (score === undefined) return null;

  const percentage = Math.round(score * 100);
  let colorClass = 'bg-gray-100 text-gray-800';

  if (percentage >= 90) {
    colorClass = 'bg-green-100 text-green-800';
  } else if (percentage >= 70) {
    colorClass = 'bg-amber-100 text-amber-800';
  } else {
    colorClass = 'bg-red-100 text-red-800';
  }

  return (
    <Badge variant="secondary" className={colorClass}>
      {percentage}% confianca
    </Badge>
  );
};

export const AddendumInsightsModal: React.FC<AddendumInsightsModalProps> = ({
  isOpen,
  onClose,
  addendum,
  pendingChanges,
  onApproveChange,
  onRejectChange,
  onApplyAll,
  isLoading = false
}) => {
  const [processingChangeId, setProcessingChangeId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!addendum) return null;

  const insights = addendum.extracted_insights;
  const approvedCount = pendingChanges.filter(c => c.status === 'approved').length;
  const pendingCount = pendingChanges.filter(c => c.status === 'pending').length;
  const canApply = approvedCount > 0 && addendum.status !== 'applied';

  const handleApprove = async (changeId: string) => {
    setProcessingChangeId(changeId);
    await onApproveChange(changeId);
    setProcessingChangeId(null);
  };

  const handleReject = async (changeId: string) => {
    setProcessingChangeId(changeId);
    await onRejectChange(changeId);
    setProcessingChangeId(null);
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    await onApplyAll();
    setIsApplying(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Insights do Anexo - {addendum.title || `Anexo ${addendum.addendum_number}`}
          </DialogTitle>
          <DialogDescription>
            Revise as alterações identificadas e aprove ou rejeite cada uma antes de aplicar ao contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-6 pr-2">
            {/* Summary Section */}
            {insights?.summary && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Resumo da Analise
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {insights.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Total: <strong>{pendingChanges.length}</strong> alteracao(oes)
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-amber-600">
                Pendentes: <strong>{pendingCount}</strong>
              </span>
              <span className="text-green-600">
                Aprovadas: <strong>{approvedCount}</strong>
              </span>
            </div>

            {/* Changes List */}
            <div className="space-y-3">
              <h3 className="font-semibold">Alteracoes Identificadas</h3>

              {pendingChanges.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma alteracao identificada neste anexo.
                  </CardContent>
                </Card>
              ) : (
                pendingChanges.map((change) => (
                  <Card key={change.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Change Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <div className="p-1.5 bg-primary/10 rounded">
                              {getChangeTypeIcon(change.change_type)}
                            </div>
                            <span className="font-medium">
                              {getChangeTypeLabel(change.change_type)}
                            </span>
                            {getStatusBadge(change.status)}
                            {getConfidenceBadge(change.confidence_score)}
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {change.change_description}
                          </p>

                          {/* Value Change Display */}
                          {(change.current_value || change.suggested_value) && (
                            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                              {change.current_value && (
                                <span className="text-muted-foreground line-through">
                                  {change.current_value}
                                </span>
                              )}
                              {change.current_value && change.suggested_value && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              {change.suggested_value && (
                                <span className="font-medium text-primary">
                                  {change.suggested_value}
                                </span>
                              )}
                            </div>
                          )}

                          {change.field_name && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Campo: <code className="bg-muted px-1 rounded">{getFieldNameLabel(change.field_name)}</code>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {change.status === 'pending' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(change.id)}
                              disabled={processingChangeId === change.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {processingChangeId === change.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(change.id)}
                              disabled={processingChangeId === change.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {processingChangeId === change.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {addendum.status === 'applied' ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Alterações já aplicadas ao contrato
                </span>
              ) : approvedCount > 0 ? (
                `${approvedCount} alteração(ões) pronta(s) para aplicar`
              ) : (
                'Aprove as alterações que deseja aplicar ao contrato'
              )}
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {canApply && (
                <Button
                  onClick={handleApplyAll}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Aplicar Aprovadas ({approvedCount})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddendumInsightsModal;
