import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock,
  Calendar,
  User,
  Building,
  FileText,
  Edit3,
  Save,
  X,
  CheckCircle,
  Circle,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { apiFetch } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/formatters';
import MaintenanceChecklist from '@/components/MaintenanceChecklist';

interface MaintenanceDetailsViewProps {
  maintenance: unknown;
  onUpdate: (updated: unknown) => void;
  onClose?: () => void;
}

interface Contract {
  id: string;
  contract_number: string;
  clients?: {
    name: string;
  };
}

interface MaintenanceStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface Region {
  id: string;
  name: string;
  color?: string;
  is_active?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  scheduled: 'Agendada',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  overdue: 'Atrasada',
  cancelled: 'Cancelada',
};

const normalizeStatusValue = (statusName?: string | null): string | null => {
  if (!statusName) return null;
  const normalized = statusName.trim().toLowerCase();

  if (normalized.includes('atras')) return 'overdue';
  if (normalized.includes('andament') || normalized.includes('execu')) return 'in_progress';
  if (normalized.includes('conclu') || normalized.includes('finaliz')) return 'completed';
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized === 'pending' || normalized === 'scheduled') return normalized;
  if (normalized.includes('agend')) return 'scheduled';
  if (normalized.includes('pend')) return 'pending';
  if (['overdue', 'in_progress', 'completed', 'cancelled', 'scheduled'].includes(normalized)) {
    return normalized;
  }
  return normalized;
};

const buildScheduledDateTime = (dateValue?: string | null, timeValue?: string | null): Date | null => {
  if (!dateValue) return null;

  const datePart = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const timePartSource = timeValue || '00:00';
  const timeParts = timePartSource.split(':');
  const hours = timeParts[0]?.padStart(2, '0') ?? '00';
  const minutes = timeParts[1]?.padStart(2, '0') ?? '00';
  const isoCandidate = `${datePart}T${hours}:${minutes}`;

  const parsed = new Date(isoCandidate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(`${isoCandidate}:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

interface ChecklistSummary {
  total: number;
  completed: number;
  requiredTotal: number;
  requiredCompleted: number;
}

interface RiskAnalysis {
  hasRisks: boolean;
  risks: string[];
  recommendation: string;
}

const analyzeMaintenanceRisks = (maintenance: any, checklistSummary: ChecklistSummary): RiskAnalysis => {
  const risks: string[] = [];
  let hasRisks = false;

  try {
    // Verifica se há técnico atribuído
    if (!maintenance?.technician || maintenance.technician === 'Não atribuído') {
      risks.push('Manutenção sem técnico responsável atribuído');
      hasRisks = true;
    }

    // Verifica status e data
    const scheduledDate = buildScheduledDateTime(maintenance?.scheduled_date, maintenance?.scheduled_time);
    const now = new Date();

    if (scheduledDate) {
      const hoursUntilMaintenance = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Manutenção muito próxima
      if (hoursUntilMaintenance > 0 && hoursUntilMaintenance < 24) {
        risks.push('Manutenção agendada para menos de 24 horas');
        hasRisks = true;
      }

      // Manutenção atrasada
      if (hoursUntilMaintenance < 0) {
        const daysLate = Math.abs(hoursUntilMaintenance / 24);
        if (daysLate > 7) {
          risks.push(`Manutenção atrasada há mais de ${Math.floor(daysLate)} dias`);
          hasRisks = true;
        }
      }
    }

    // Verifica tipo de manutenção
    if (maintenance?.type === 'Emergencial' || maintenance?.type === 'Corretiva') {
      risks.push(`Manutenção do tipo ${maintenance.type} requer atenção especial`);
      hasRisks = true;
    }

    // Verifica checklist - com verificação de tipo segura
    if (checklistSummary && typeof checklistSummary.total === 'number' && checklistSummary.total > 0) {
      const completionRate = (checklistSummary.completed / checklistSummary.total) * 100;
      if (completionRate < 50) {
        risks.push(`Checklist com apenas ${Math.round(completionRate)}% de conclusão`);
        hasRisks = true;
      }
    }

    // Verifica frequência
    if (maintenance?.frequency === 'weekly' || maintenance?.frequency === 'biweekly') {
      risks.push('Manutenção de alta frequência - verificar recursos disponíveis');
      hasRisks = true;
    }

    // Gera recomendação baseada nos riscos
    let recommendation = 'Continue monitorando o progresso da manutenção.';

    if (risks.length > 2) {
      recommendation = 'Múltiplos riscos identificados. Considere revisar o planejamento desta manutenção.';
    } else if (risks.some(r => r.includes('atrasada'))) {
      recommendation = 'Priorize a execução desta manutenção ou considere reagendar.';
    } else if (risks.some(r => r.includes('Emergencial'))) {
      recommendation = 'Mobilize recursos imediatamente para esta manutenção emergencial.';
    } else if (risks.some(r => r.includes('técnico'))) {
      recommendation = 'Atribua um técnico responsável o quanto antes.';
    }

    return {
      hasRisks,
      risks,
      recommendation
    };
  } catch (error) {
    console.error('Erro ao analisar riscos da manutenção:', error);
    return {
      hasRisks: false,
      risks: [],
      recommendation: 'Não foi possível analisar riscos.'
    };
  }
};

export default function MaintenanceDetailsView({ maintenance, onUpdate, onClose }: MaintenanceDetailsViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [checklistProgress, setChecklistProgress] = useState(0);
  const [checklistSummary, setChecklistSummary] = useState({
    total: 0,
    completed: 0,
    requiredTotal: 0,
    requiredCompleted: 0
  });
  const [formData, setFormData] = useState({
    contract_id: maintenance.contract_id || '',
    client_name: maintenance.client_name || '',
    technician: maintenance.technician || '',
    description: maintenance.description || '',
    scheduled_date: maintenance.scheduled_date || '',
    scheduled_time: maintenance.scheduled_time || '',
    end_time: maintenance.end_time || '',
    notes: maintenance.notes || '',
    status_id: maintenance.status_id || '',
    type: maintenance.type || '',
    estimated_duration: maintenance.estimated_duration || 120,
    frequency: maintenance.frequency || '',
    region_id: maintenance.region_id || ''
  });
  const statusProgress = useMemo(() => {
    const currentStatus = statuses.find(s => s.id === formData.status_id);
    const rawStatus = currentStatus?.name || maintenance.status_name || maintenance.status || '';
    const slugBase = rawStatus.toLowerCase();
    const slug = normalizeStatusValue(rawStatus) || slugBase;

    switch (slug) {
      case 'overdue':
      case 'cancelled':
        return 0;
      case 'pending':
      case 'scheduled':
        return 20;
      case 'in_progress':
        return 50;
      case 'checklist':
        return 75;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  }, [statuses, formData.status_id, maintenance.status_name, maintenance.status]);

  const statusSteps = useMemo(() => {
    const currentStatus = statuses.find(s => s.id === formData.status_id);
    const rawStatus = currentStatus?.name || maintenance.status_name || maintenance.status || '';
    const slugBase = rawStatus.toLowerCase();
    const slug = normalizeStatusValue(rawStatus) || slugBase;

    if (slug === 'overdue') {
      return [
        { name: 'Agendada', completed: false, current: true },
        { name: 'Iniciada', completed: false },
        { name: 'Em Execução', completed: false },
        { name: 'Checklist', completed: false },
        { name: 'Finalizada', completed: false }
      ];
    }

    if (slug === 'cancelled') {
      return [
        { name: 'Agendada', completed: true },
        { name: 'Iniciada', completed: false },
        { name: 'Em Execução', completed: false },
        { name: 'Checklist', completed: false },
        { name: 'Finalizada', completed: false }
      ];
    }

    if (slug === 'completed') {
      return [
        { name: 'Agendada', completed: true },
        { name: 'Iniciada', completed: true },
        { name: 'Em Execução', completed: true },
        { name: 'Checklist', completed: true },
        { name: 'Finalizada', completed: true }
      ];
    }

    if (slug === 'in_progress') {
      return [
        { name: 'Agendada', completed: true },
        { name: 'Iniciada', completed: true },
        { name: 'Em Execução', completed: true, current: true },
        { name: 'Checklist', completed: false },
        { name: 'Finalizada', completed: false }
      ];
    }

    if (slug === 'checklist') {
      return [
        { name: 'Agendada', completed: true },
        { name: 'Iniciada', completed: true },
        { name: 'Em Execução', completed: true },
        { name: 'Checklist', completed: true, current: true },
        { name: 'Finalizada', completed: false }
      ];
    }

    if (slug === 'iniciada') {
      return [
        { name: 'Agendada', completed: true },
        { name: 'Iniciada', completed: true, current: true },
        { name: 'Em Execução', completed: false },
        { name: 'Checklist', completed: false },
        { name: 'Finalizada', completed: false }
      ];
    }

    return [
      { name: 'Agendada', completed: statusProgress >= 20 },
      { name: 'Iniciada', completed: statusProgress >= 25 },
      { name: 'Em Execução', completed: statusProgress >= 50 },
      { name: 'Checklist', completed: statusProgress >= 75 },
      { name: 'Finalizada', completed: statusProgress >= 100 }
    ];
  }, [statusProgress, statuses, formData.status_id, maintenance.status_name, maintenance.status]);

  const { toast } = useToast();

  useEffect(() => {
    loadContracts();
    loadStatuses();
    loadRegions();
  }, []);

  // Reseta o formulário APENAS quando uma manutenção diferente é carregada (baseado no ID)
  // Isso evita que edições do usuário sejam sobrescritas por re-renders do componente pai
  useEffect(() => {
    setFormData({
      contract_id: maintenance.contract_id || '',
      client_name: maintenance.client_name || '',
      technician: maintenance.technician || '',
      description: maintenance.description || '',
      scheduled_date: maintenance.scheduled_date || '',
      scheduled_time: maintenance.scheduled_time || '',
      end_time: maintenance.end_time || '',
      notes: maintenance.notes || '',
      status_id: maintenance.status_id || '',
      type: maintenance.type || '',
      estimated_duration: maintenance.estimated_duration || 120,
      frequency: maintenance.frequency || '',
      region_id: maintenance.region_id || ''
    });
    // Resetar estado de edição quando muda a manutenção
    setIsEditing(false);
  }, [maintenance.id]);

  const loadContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          clients!contracts_client_id_fkey (
            name
          )
        `)
        .order('contract_number');

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const loadStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_status')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const translated = (data || []).map(status => {
        const slug = normalizeStatusValue(status.name);
        const translatedName = slug && STATUS_LABELS[slug] ? STATUS_LABELS[slug] : status.name;

        return {
          ...status,
          name: translatedName,
          description: status.description || translatedName,
        };
      });

      if (translated.length === 0) {
        setStatuses([
          { id: 'pending', name: STATUS_LABELS.pending, color: '#64748b' },
          { id: 'scheduled', name: STATUS_LABELS.scheduled, color: '#3b82f6' },
          { id: 'in_progress', name: STATUS_LABELS.in_progress, color: '#f97316' },
          { id: 'completed', name: STATUS_LABELS.completed, color: '#10b981' },
          { id: 'overdue', name: STATUS_LABELS.overdue, color: '#ef4444' },
          { id: 'cancelled', name: STATUS_LABELS.cancelled, color: '#6b7280' }
        ]);
      } else {
        setStatuses(translated);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
      setStatuses([
        { id: 'pending', name: STATUS_LABELS.pending, color: '#64748b' },
        { id: 'scheduled', name: STATUS_LABELS.scheduled, color: '#3b82f6' },
        { id: 'in_progress', name: STATUS_LABELS.in_progress, color: '#f97316' },
        { id: 'completed', name: STATUS_LABELS.completed, color: '#10b981' },
        { id: 'overdue', name: STATUS_LABELS.overdue, color: '#ef4444' },
        { id: 'cancelled', name: STATUS_LABELS.cancelled, color: '#6b7280' }
      ]);
    }
  };

  const loadRegions = async () => {
    try {
      const data = await apiFetch<Region[]>('/api/regions');
      // Filter only active regions
      setRegions((data || []).filter(r => r.is_active));
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (!maintenance.id) {
      toast({
        title: "Erro",
        description: "ID da manutenção não encontrado",
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);
    try {
      await apiFetch(`/api/maintenances/${maintenance.id}`, {
        method: 'DELETE'
      });

      toast({
        title: "Sucesso",
        description: "Manutenção excluída com sucesso"
      });

      // Notify parent and close
      onUpdate({ ...maintenance, deleted: true });
      onClose?.();
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a manutenção",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!maintenance.id) {
      toast({
        title: "Erro",
        description: "ID da manutenção não encontrado",
        variant: "destructive"
      });
      return;
    }

    // Validação de itens obrigatórios do checklist
    if (checklistSummary.requiredTotal > 0 && checklistSummary.requiredCompleted < checklistSummary.requiredTotal) {
      const itemsPending = checklistSummary.requiredTotal - checklistSummary.requiredCompleted;
      toast({
        title: "⚠️ Checklist Incompleto",
        description: (
          <div className="space-y-2">
            <p>Existem {itemsPending} {itemsPending === 1 ? 'item obrigatório' : 'itens obrigatórios'} pendentes no checklist.</p>
            <p className="text-sm">Complete todos os itens obrigatórios antes de salvar a manutenção.</p>
          </div>
        ),
        variant: "destructive",
        duration: 6000
      });
      return;
    }

    setLoading(true);
    try {
      // Validate required fields
      if (!formData.technician?.trim()) {
        toast({
          title: "Atenção",
          description: "Nome do técnico é obrigatório",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validação de data baseada no status selecionado
      // Regras específicas por status
      if (formData.scheduled_date && formData.status_id) {
        const parseLocalDate = (dateString: string) => {
          if (!dateString) return null;
          const [year, month, day] = dateString.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const selectedDate = parseLocalDate(formData.scheduled_date);
        if (selectedDate) {
          selectedDate.setHours(0, 0, 0, 0);
        }

        const selectedStatus = statuses.find((s) => s.id === formData.status_id);
        const statusSlug = normalizeStatusValue(selectedStatus?.name);

        if (selectedDate && statusSlug) {
          const isPast = selectedDate < now;
          const isToday = selectedDate.getTime() === now.getTime();
          const isFuture = selectedDate > now;

          let isValidDate = true;
          let errorMessage = '';

          switch(statusSlug) {
            case 'completed': // Concluída: Passada OK, Hoje OK, Futura NÃO
              if (isFuture) {
                isValidDate = false;
                errorMessage = "Não é permitido marcar como concluída uma manutenção futura. A manutenção ainda não ocorreu.";
              }
              break;

            case 'in_progress': // Em Andamento: Passada OK, Hoje OK, Futura NÃO
              if (isFuture) {
                isValidDate = false;
                errorMessage = "Não é permitido marcar como em andamento uma manutenção futura. A manutenção só pode estar em andamento na data agendada ou depois.";
              }
              break;

            case 'scheduled': // Agendada: Passada NÃO, Hoje OK, Futura OK
              if (isPast) {
                isValidDate = false;
                errorMessage = "Não é permitido agendar uma manutenção para uma data passada. Selecione uma data de hoje em diante.";
              }
              break;

            case 'overdue': // Atrasada: Passada OK, Hoje OK, Futura NÃO
              if (isFuture) {
                isValidDate = false;
                errorMessage = "Não é permitido marcar como atrasada uma manutenção futura. Só pode estar atrasada na data agendada ou depois.";
              }
              break;

            case 'cancelled': // Cancelada: Passada OK, Hoje NÃO, Futura OK
              if (isToday) {
                isValidDate = false;
                errorMessage = "Não é permitido cancelar uma manutenção agendada para hoje.";
              }
              break;

            case 'pending': // Pendente: Passada OK, Hoje OK, Futura OK
              // Sem restrições para pendente
              break;
          }

          if (!isValidDate) {
            toast({
              title: "Data inválida",
              description: errorMessage,
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }
      }

      const selectedStatus = statuses.find((s) => s.id === formData.status_id);
      const statusSlugRaw = normalizeStatusValue(selectedStatus?.name || maintenance.status || maintenance.status_name);

      // Update maintenance with all fields
      const { error } = await supabase
        .from('maintenances')
        .update({
          contract_id: formData.contract_id || null,
          technician: formData.technician.trim(),
          description: formData.description?.trim(),
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          end_time: formData.end_time || null,
          notes: formData.notes?.trim(),
          status_id: formData.status_id || null,
          ...(statusSlugRaw ? { status: statusSlugRaw } : {}),
          type: formData.type || null,
          estimated_duration: formData.estimated_duration || null,
          frequency: formData.frequency || null,
          region_id: formData.region_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', maintenance.id);

      if (error) throw error;

      // Get client name from selected contract
      let clientName = formData.client_name;
      if (formData.contract_id) {
        const selectedContract = contracts.find(c => c.id === formData.contract_id);
        clientName = selectedContract?.clients?.name || clientName;
      }

      const updatedMaintenance = {
        ...maintenance,
        ...formData,
        client_name: clientName
      };

      onUpdate(updatedMaintenance);
      setIsEditing(false);

      // Análise de riscos após salvar
      const riskAnalysis = analyzeMaintenanceRisks(updatedMaintenance, checklistSummary);

      if (riskAnalysis.hasRisks) {
        // Mostrar riscos identificados
        setTimeout(() => {
          toast({
            title: "⚠️ Riscos Identificados",
            description: (
              <div className="space-y-2 mt-2">
                <p className="font-medium">Foram identificados os seguintes riscos:</p>
                <ul className="text-xs space-y-1">
                  {riskAnalysis.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs mt-2 pt-2 border-t">
                  Recomendação: {riskAnalysis.recommendation}
                </p>
              </div>
            ),
            variant: "destructive",
            duration: 10000
          });
        }, 600);
      } else {
        toast({
          title: "✅ Sucesso",
          description: "Manutenção salva com sucesso! Nenhum risco identificado."
        });
      }

      // Fechar modal automaticamente após salvar
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 500); // Pequeno delay para o usuário ver o toast de sucesso
      }
    } catch (error) {
      console.error('Error updating maintenance:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as informações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      contract_id: maintenance.contract_id || '',
      client_name: maintenance.client_name || '',
      technician: maintenance.technician || '',
      description: maintenance.description || '',
      scheduled_date: maintenance.scheduled_date || '',
      scheduled_time: maintenance.scheduled_time || '',
      end_time: maintenance.end_time || '',
      notes: maintenance.notes || '',
      status_id: maintenance.status_id || '',
      type: maintenance.type || '',
      estimated_duration: maintenance.estimated_duration || 120,
      frequency: maintenance.frequency || '',
      region_id: maintenance.region_id || ''
    });
    setIsEditing(false);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">
            Acompanhamento - {maintenance.type || 'Preventiva'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-medium">Status da Manutenção</h3>
            </div>
            {isEditing ? (
              <Select
                value={formData.status_id || ''}
                onValueChange={(value) => handleInputChange('status_id', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-md">
                {(() => {
                  const currentStatus = statuses.find(s => s.id === formData.status_id);
                  const normalizedMaintenanceStatus = normalizeStatusValue(maintenance.status_name || maintenance.status);
                  const statusName = currentStatus?.name
                    || (normalizedMaintenanceStatus && STATUS_LABELS[normalizedMaintenanceStatus])
                    || maintenance.status_name
                    || STATUS_LABELS.pending;
                  const statusColor = currentStatus?.color || maintenance.status_color || '#6b7280';

                  return (
                    <>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="text-sm font-medium">{statusName}</span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso Geral</span>
              <span>{statusProgress}%</span>
            </div>
            <Progress value={statusProgress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step.name} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.completed 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <Badge variant={step.completed ? "default" : "outline"} className="text-xs">
                  {step.name}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="observations">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Informações da Manutenção</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Manutenção */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Manutenção</Label>
                  {isEditing ? (
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manutenção Preventiva 250h">Manutenção Preventiva 250h</SelectItem>
                        <SelectItem value="Manutenção Preventiva 500h">Manutenção Preventiva 500h</SelectItem>
                        <SelectItem value="Manutenção Mensal">Manutenção Mensal</SelectItem>
                        <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
                        <SelectItem value="Atendimento Emergencial">Atendimento Emergencial</SelectItem>
                        <SelectItem value="Teste de Carga / Operação Assistida de Partida">Teste de Carga / Operação Assistida</SelectItem>
                        <SelectItem value="Startup / Comissionamento">Startup / Comissionamento</SelectItem>
                        <SelectItem value="Avarias de Controlador">Avarias de Controlador</SelectItem>
                        <SelectItem value="Visita Técnica Orçamentária">Visita Técnica Orçamentária</SelectItem>
                        <SelectItem value="Visita Técnica de Inspeção">Visita Técnica de Inspeção</SelectItem>
                        <SelectItem value="Inspeção de Alternador">Inspeção de Alternador</SelectItem>
                        <SelectItem value="Limpeza de Radiador">Limpeza de Radiador</SelectItem>
                        <SelectItem value="Instalação de Equipamentos">Instalação de Equipamentos</SelectItem>
                        <SelectItem value="Instalação de GMG – Próprio (permanente)">Instalação de GMG – Próprio</SelectItem>
                        <SelectItem value="Limpeza de Tanque">Limpeza de Tanque</SelectItem>
                        <SelectItem value="Troca de Bateria">Troca de Bateria</SelectItem>
                        <SelectItem value="Manutenção Mensal (complementar)">Manutenção Mensal (complementar)</SelectItem>
                        <SelectItem value="Regulagem de Válvulas">Regulagem de Válvulas</SelectItem>
                        <SelectItem value="Revisão/Calibração de Bomba Injetora">Revisão/Calibração de Bomba Injetora</SelectItem>
                        <SelectItem value="Entrega/Retirada de GMG">Entrega/Retirada de GMG</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-base font-medium">
                      {formData.type || 'Manutenção Mensal'}
                    </div>
                  )}
                </div>


                {/* Contrato */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Contrato</Label>
                  {isEditing ? (
                    <Select
                      value={formData.contract_id}
                      onValueChange={(value) => handleInputChange('contract_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum contrato</SelectItem>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contract_number} - {contract.clients?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-base">
                      {formData.contract_id ?
                        contracts.find(c => c.id === formData.contract_id)?.contract_number || 'Não informado'
                        : 'Não informado'
                      }
                    </div>
                  )}
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                  <div className="text-base font-medium">
                    {formData.contract_id ?
                      contracts.find(c => c.id === formData.contract_id)?.clients?.name || formData.client_name || 'ASSOCIACAO DE ADQUIRENTES DO EDIFICIO MARES'
                      : formData.client_name || 'ASSOCIACAO DE ADQUIRENTES DO EDIFICIO MARES'
                    }
                  </div>
                </div>

                {/* Data Agendada */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data Agendada</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.scheduled_date ? formatDate(formData.scheduled_date) : 'Selecione uma data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <UICalendar
                          mode="single"
                          selected={formData.scheduled_date ? new Date(formData.scheduled_date + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              handleInputChange('scheduled_date', `${year}-${month}-${day}`);
                            }
                          }}
                          // Permitir seleção de qualquer data - validação será feita ao salvar
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      {formData.scheduled_date ? formatDate(formData.scheduled_date) : '11/08/2025'}
                    </div>
                  )}
                </div>

                {/* Horário Início */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Horário Início</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      {formData.scheduled_time || '09:00'}
                    </div>
                  )}
                </div>

                {/* Horário Fim */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Horário Fim</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      {formData.end_time || '--:--'}
                    </div>
                  )}
                </div>

                {/* Técnico */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Técnico</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Nome do técnico responsável"
                      value={formData.technician}
                      onChange={(e) => handleInputChange('technician', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      {formData.technician || 'Não atribuído'}
                    </div>
                  )}
                </div>

                {/* Região */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Região</Label>
                  {isEditing ? (
                    <Select
                      value={formData.region_id}
                      onValueChange={(value) => handleInputChange('region_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a região" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma região</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            <div className="flex items-center gap-2">
                              {region.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: region.color }}
                                />
                              )}
                              {region.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-base">
                      {(() => {
                        // Usar formData.region_id ou fallback para maintenance.region_id
                        const regionId = formData.region_id || (maintenance as any).region_id;
                        const currentRegion = regions.find(r => r.id === regionId);
                        if (currentRegion) {
                          return (
                            <>
                              {currentRegion.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: currentRegion.color }}
                                />
                              )}
                              {currentRegion.name}
                            </>
                          );
                        }
                        return 'Não definida';
                      })()}
                    </div>
                  )}
                </div>

              </div>

              <Separator />

              {/* Descrição */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                {isEditing ? (
                  <Textarea
                    placeholder="Descreva os detalhes da manutenção..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <div className="text-base">
                    {formData.description || 'Manutenção preventiva - Grupo Gerador'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Resumo do Checklist</h3>
              <p className="text-sm text-muted-foreground">
                {checklistSummary.total > 0
                  ? `${checklistSummary.completed} de ${checklistSummary.total} itens concluídos`
                  : 'Nenhum item registrado'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Progress value={checklistProgress} className="w-full sm:w-48" />
              {checklistSummary.requiredTotal > 0 && (
                <Badge
                  variant="outline"
                  className={`w-fit ${checklistSummary.requiredCompleted === checklistSummary.requiredTotal ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                >
                  {checklistSummary.requiredCompleted}/{checklistSummary.requiredTotal} obrigatórios
                </Badge>
              )}
            </div>
          </div>

          <MaintenanceChecklist
            maintenanceId={maintenance.id}
            maintenanceStatus={maintenance.status}
            maintenanceType={formData.type}
            onProgressUpdate={setChecklistProgress}
            onSummaryChange={setChecklistSummary}
          />
        </TabsContent>

        <TabsContent value="observations">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Observações</h3>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  placeholder="Adicione observações sobre a manutenção..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                />
              ) : (
                <div className="text-base whitespace-pre-wrap break-words">
                  {formData.notes || 'Nenhuma observação registrada.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
