import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate as formatDateUtil } from "@/utils/formatters";
import { generateMaintenances } from "@/utils/generateMaintenances";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface ContractMaintenancesListProps {
  contractId: string;
  contractData?: unknown;
}

const ContractMaintenancesList: React.FC<ContractMaintenancesListProps> = ({
  contractId,
  contractData,
}) => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [maintenances, setMaintenances] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<unknown>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    scheduled_date: "",
    scheduled_time: "",
    technician: "",
    type: "",
    status: "",
    notes: "",
  });
  const [overdueCounts, setOverdueCounts] = useState(0);

  useEffect(() => {
    loadMaintenances();
  }, [contractId]);

  // Check for overdue maintenances
  useEffect(() => {
    const now = new Date();
    const overdueCount = maintenances.filter((m) => {
      // Count items that are already marked as overdue
      if (m.status === "overdue") return true;
      
      // Also check if scheduled items should be overdue
      if (m.status === "scheduled") {
        const scheduledDate = new Date(
          m.scheduled_date + "T" + (m.scheduled_time || "09:00"),
        );
        return scheduledDate < now;
      }
      
      return false;
    }).length;
    setOverdueCounts(overdueCount);
  }, [maintenances]);

  // Listen for maintenance updates from other components
  useEffect(() => {
    const handleMaintenanceUpdate = (event: CustomEvent) => {
      console.log("ContractMaintenancesList: Evento de atualização de manutenção recebido:", event.detail);
      loadMaintenances();
    };

    window.addEventListener('maintenanceUpdated', handleMaintenanceUpdate as EventListener);

    return () => {
      window.removeEventListener('maintenanceUpdated', handleMaintenanceUpdate as EventListener);
    };
  }, []);

  const loadMaintenances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("maintenances")
        .select("*")
        .eq("contract_id", contractId)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      // Check and update overdue status ONLY for newly loaded maintenances
      // Don't override manual status changes by users
      const now = new Date();

      const updatedMaintenances = await Promise.all(
        (data || []).map(async (m) => {
          // Only auto-update to overdue if:
          // 1. Status is "scheduled" (not manually changed by user)
          // 2. Date has passed
          // 3. Not recently updated (within last 5 minutes)
          const lastUpdate = m.updated_at ? new Date(m.updated_at) : new Date(0);
          const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
          const recentlyUpdated = timeSinceUpdate < 5 * 60 * 1000; // 5 minutes

          // Only auto-mark as overdue if status is "scheduled" AND not recently updated
          if (m.status === "scheduled" && !recentlyUpdated) {
            const scheduledDate = new Date(
              m.scheduled_date + "T" + (m.scheduled_time || "09:00"),
            );

            if (scheduledDate < now) {
              console.log(`⚠️ Auto-marcando manutenção ${m.id} como atrasada (data: ${m.scheduled_date})`);
              // Update status in database
              await supabase
                .from("maintenances")
                .update({ status: "overdue" })
                .eq("id", m.id);
              return { ...m, status: "overdue" };
            }
          }

          // Keep current status for all other cases
          // This respects manual user changes (pending, in_progress, completed, cancelled)
          return m;
        }),
      );

      setMaintenances(updatedMaintenances);
    } catch (error) {
      console.error("Error loading maintenances:", error);
      toast({
        title: "Erro ao carregar manutenções",
        description: "Não foi possível carregar a lista de manutenções",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMaintenancesForContract = async () => {
    if (!contractData) {
      toast({
        title: "Dados incompletos",
        description: "Não foi possível obter os dados do contrato",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);

      if (!user?.id) {
        toast({
          title: "Usuário não autenticado",
          description: "Faça login novamente para gerar manutenções",
          variant: "destructive",
        });
        setGenerating(false);
        return;
      }

      const result = await generateMaintenances({
        contractId: contractId,
        startDate: contractData.start_date,
        endDate: contractData.end_date,
        frequency: contractData.maintenance_frequency || "monthly",
        contractType: contractData.contract_type,
        userId: user.id,
      });

      if (result.success) {
        toast({
          title: "Manutenções geradas!",
          description: `${result.count} manutenções foram criadas com sucesso`,
        });
        await loadMaintenances();
      } else {
        throw new Error("Falha ao gerar manutenções");
      }
    } catch (error) {
      console.error("Error generating maintenances:", error);
      toast({
        title: "Erro ao gerar manutenções",
        description: "Não foi possível gerar as manutenções",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getMaintenanceDateTime = (maintenance: unknown): Date | null => {
    if (!maintenance?.scheduled_date) return null;

    const datePart = maintenance.scheduled_date.includes('T')
      ? maintenance.scheduled_date.split('T')[0]
      : maintenance.scheduled_date;

    const timeSource = maintenance.scheduled_time || '00:00';
    const timeParts = timeSource.split(':');
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

  const updateMaintenanceStatus = async (
    maintenanceId: string,
    newStatus: string,
  ) => {
    try {
      console.log(`🔄 [Maintenance] Atualizando status da manutenção ${maintenanceId} para: ${newStatus}`);

      const maintenance = maintenances.find((m) => m.id === maintenanceId);
      if (!maintenance) {
        toast({
          title: "Manutenção não encontrada",
          description: "Recarregue a página e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const validationStatus = newStatus === 'scheduled' ? 'pending' : newStatus;
      const scheduledDateTime = getMaintenanceDateTime(maintenance);

      if ((validationStatus === 'pending' || validationStatus === 'overdue') && !scheduledDateTime) {
        toast({
          title: "Dados incompletos",
          description: "Não foi possível validar a data/hora desta manutenção antes de alterar o status.",
          variant: "destructive",
        });
        return;
      }

      if (scheduledDateTime) {
        const now = new Date();

        if (validationStatus === 'overdue' && scheduledDateTime > now) {
          toast({
            title: "Status inválido",
            description: "Só é possível marcar como atrasada quando a data e o horário já passaram.",
            variant: "destructive",
          });
          return;
        }

        if (validationStatus === 'pending' && scheduledDateTime < now) {
          toast({
            title: "Status inválido",
            description: "Reagende a manutenção para uma data futura antes de marcá-la como pendente.",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from("maintenances")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", maintenanceId);

      if (error) {
        console.error('❌ [Maintenance] Erro ao atualizar status:', error);
        throw error;
      }

      console.log(`✅ [Maintenance] Status atualizado com sucesso para: ${newStatus}`);

      const statusLabelMap: Record<string, string> = {
        pending: 'Pendente',
        scheduled: 'Agendada',
        in_progress: 'Em Andamento',
        completed: 'Concluída',
        overdue: 'Atrasada',
        cancelled: 'Cancelada',
      };

      toast({
        title: "Status atualizado",
        description: `Status alterado para: ${statusLabelMap[newStatus] || newStatus}`,
      });

      await loadMaintenances();

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('maintenanceUpdated', {
        detail: { maintenanceId, newStatus }
      }));
    } catch (error) {
      console.error("Error updating maintenance status:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  // Função para verificar se a data é fim de semana
  const isWeekend = (dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00'); // Adicionar horário para evitar problemas de timezone
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
  };

  // Handler para mudança de data com validação de fim de semana
  const handleDateChange = (dateString: string) => {
    if (isWeekend(dateString)) {
      toast({
        title: "Agendamento em final de semana",
        description: "Esta manutenção ficará sinalizada como final de semana para orientar a equipe operacional.",
      });
    }

    setEditFormData({
      ...editFormData,
      scheduled_date: dateString,
    });
  };

  const handleEditClick = (maintenance: unknown) => {
    setEditingMaintenance(maintenance);
    setEditFormData({
      scheduled_date: maintenance.scheduled_date || "",
      scheduled_time: maintenance.scheduled_time || "09:00",
      technician: maintenance.technician || "",
      type: maintenance.type || "",
      status: maintenance.status || "scheduled",
      notes: maintenance.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingMaintenance) return;

    const weekendSelected = isWeekend(editFormData.scheduled_date);
    if (weekendSelected) {
      toast({
        title: "Agendamento em final de semana",
        description: "A manutenção será mantida, mas exibirá um alerta de final de semana nas telas do sistema.",
      });
    }

    try {
      // VALIDAÇÃO CRÍTICA: Bloquear seleção de datas passadas via interface
      // Datas passadas só podem vir do upload automático do contrato
      // 🔧 FIX: Parse date in local timezone to avoid timezone offset issues
      const parseLocalDate = (dateString: string) => {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const now = new Date();
      now.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data

      const selectedDate = parseLocalDate(editFormData.scheduled_date);
      if (selectedDate) {
        selectedDate.setHours(0, 0, 0, 0);
      }

      // Validação baseada no status e data
      let finalStatus = editFormData.status;

      if (selectedDate) {
        const isPast = selectedDate < now;
        const isToday = selectedDate.getTime() === now.getTime();
        const isFuture = selectedDate > now;

        let isValidDate = true;
        let errorMessage = '';

        switch(editFormData.status) {
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
              // Se está mudando para uma data futura, automaticamente muda o status para "scheduled"
              console.log('✅ [Maintenance] Reagendando manutenção atrasada - status → "scheduled"');
              finalStatus = "scheduled";
              toast({
                title: "Manutenção reagendada",
                description: "Status alterado para 'Agendada' pois a data foi movida para o futuro.",
                variant: "default",
              });
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
          console.error(`❌ [Maintenance] Validação falhou: ${errorMessage}`);
          toast({
            title: "Data inválida",
            description: errorMessage,
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from("maintenances")
        .update({
          scheduled_date: editFormData.scheduled_date,
          scheduled_time: editFormData.scheduled_time,
          technician: editFormData.technician,
          type: editFormData.type,
          status: finalStatus,
          notes: editFormData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMaintenance.id);

      if (error) throw error;

      toast({
        title: "Manutenção atualizada",
        description: "As informações foram atualizadas com sucesso",
      });

      setIsEditDialogOpen(false);
      setEditingMaintenance(null);
      await loadMaintenances();

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('maintenanceUpdated', {
        detail: { maintenanceId: editingMaintenance.id, action: 'edit' }
      }));
    } catch (error) {
      console.error("Error updating maintenance:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a manutenção",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "Não definido";
    return formatDateUtil(date) || date;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: {
        variant: "secondary" as const,
        label: "Agendada",
        icon: Clock,
      },
      in_progress: {
        variant: "default" as const,
        label: "Em Andamento",
        icon: Settings,
      },
      completed: {
        variant: "success" as const,
        label: "Concluída",
        icon: CheckCircle,
      },
      cancelled: {
        variant: "destructive" as const,
        label: "Cancelada",
        icon: AlertCircle,
      },
      overdue: {
        variant: "destructive" as const,
        label: "Atrasada",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Manutenção Preventiva 250h': 'bg-green-100 text-green-800',
      'Manutenção Preventiva 500h': 'bg-emerald-100 text-emerald-800',
      'Manutenção Mensal': 'bg-teal-100 text-teal-800',
      'Manutenção Corretiva': 'bg-amber-100 text-amber-800',
      'Atendimento Emergencial': 'bg-red-100 text-red-800',
      'Teste de Carga / Operação Assistida de Partida': 'bg-violet-100 text-violet-800',
      'Startup / Comissionamento': 'bg-indigo-100 text-indigo-800',
      'Avarias de Controlador': 'bg-rose-100 text-rose-800',
      'Visita Técnica Orçamentária': 'bg-sky-100 text-sky-800',
      'Visita Técnica de Inspeção': 'bg-cyan-100 text-cyan-800',
      'Inspeção de Alternador': 'bg-blue-100 text-blue-800',
      'Limpeza de Radiador': 'bg-lime-100 text-lime-800',
      'Instalação de Equipamentos': 'bg-purple-100 text-purple-800',
      'Instalação de GMG – Próprio (permanente)': 'bg-fuchsia-100 text-fuchsia-800',
      'Limpeza de Tanque': 'bg-green-100 text-green-800',
      'Troca de Bateria': 'bg-yellow-100 text-yellow-800',
      'Manutenção Mensal (complementar)': 'bg-teal-100 text-teal-800',
      'Regulagem de Válvulas': 'bg-orange-100 text-orange-800',
      'Revisão/Calibração de Bomba Injetora': 'bg-pink-100 text-pink-800',
      'Entrega/Retirada de GMG': 'bg-slate-100 text-slate-800',
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando manutenções...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lista de Manutenções</h2>
        {maintenances.length === 0 && (
          <Button
            onClick={generateMaintenancesForContract}
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Gerando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Gerar Manutenções
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{maintenances.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold">
                  {
                    maintenances.filter((m) => {
                      // Don't count overdue maintenances
                      if (m.status === "overdue") return false;
                      
                      // Check scheduled and pending maintenances
                      if (m.status === "scheduled" || m.status === "pending") {
                        const now = new Date();
                        const scheduledDate = new Date(
                          m.scheduled_date +
                            "T" +
                            (m.scheduled_time || "09:00"),
                        );
                        // Only count as scheduled if in the future
                        return scheduledDate >= now;
                      }
                      return false;
                    }).length
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">
                  {
                    maintenances.filter((m) => m.status === "in_progress")
                      .length
                  }
                </p>
              </div>
              <Settings className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">
                  {maintenances.filter((m) => m.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {overdueCounts}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueCounts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                {overdueCounts}{" "}
                {overdueCounts === 1
                  ? "manutenção atrasada"
                  : "manutenções atrasadas"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenances List */}
      {maintenances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma manutenção programada
            </h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Gerar Manutenções" para criar o cronograma de
              manutenções deste contrato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {maintenances.map((maintenance, index) => (
            <Card
              key={maintenance.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold">
                        #{index + 1}
                      </span>
                      <Badge className={getTypeColor(maintenance.type)}>
                        {maintenance.type}
                      </Badge>
                      {(() => {
                        // Check real-time if maintenance is overdue
                        const now = new Date();
                        const scheduledDate = new Date(
                          maintenance.scheduled_date +
                            "T" +
                            (maintenance.scheduled_time || "09:00"),
                        );
                        const actualStatus =
                          maintenance.status === "scheduled" &&
                          scheduledDate < now
                            ? "overdue"
                            : maintenance.status;
                        return getStatusBadge(actualStatus);
                      })()}
                    </div>

                    <h3 className="font-medium text-lg mb-2">
                      {maintenance.description}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Data: {formatDate(maintenance.scheduled_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Hora: {maintenance.scheduled_time || "09:00"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Técnico: {maintenance.technician || "Não atribuído"}
                        </span>
                      </div>
                    </div>

                    {maintenance.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {maintenance.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {maintenance.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateMaintenanceStatus(maintenance.id, "in_progress")
                        }
                      >
                        Iniciar
                      </Button>
                    )}
                    {maintenance.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateMaintenanceStatus(maintenance.id, "completed")
                        }
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Manutenção</DialogTitle>
            <DialogDescription>
              Atualize as informações da manutenção
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data</Label>
                <DatePicker
                  id="edit-date"
                  value={editFormData.scheduled_date}
                  onChangeString={handleDateChange}
                  allowWeekends={true}
                  placeholder="Selecione uma data"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Horário</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editFormData.scheduled_time}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      scheduled_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-technician">Técnico Responsável</Label>
              <Input
                id="edit-technician"
                value={editFormData.technician}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    technician: e.target.value,
                  })
                }
                placeholder="Nome do técnico"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Tipo</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, type: value })
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manutenção Preventiva 250h">Manutenção Preventiva 250h</SelectItem>
                    <SelectItem value="Manutenção Preventiva 500h">Manutenção Preventiva 500h</SelectItem>
                    <SelectItem value="Manutenção Mensal">Manutenção Mensal</SelectItem>
                    <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
                    <SelectItem value="Atendimento Emergencial">Atendimento Emergencial</SelectItem>
                    <SelectItem value="Teste de Carga / Operação Assistida de Partida">Teste de Carga / Operação Assistida de Partida</SelectItem>
                    <SelectItem value="Startup / Comissionamento">Startup / Comissionamento</SelectItem>
                    <SelectItem value="Avarias de Controlador">Avarias de Controlador</SelectItem>
                    <SelectItem value="Visita Técnica Orçamentária">Visita Técnica Orçamentária</SelectItem>
                    <SelectItem value="Visita Técnica de Inspeção">Visita Técnica de Inspeção</SelectItem>
                    <SelectItem value="Inspeção de Alternador">Inspeção de Alternador</SelectItem>
                    <SelectItem value="Limpeza de Radiador">Limpeza de Radiador</SelectItem>
                    <SelectItem value="Instalação de Equipamentos">Instalação de Equipamentos</SelectItem>
                    <SelectItem value="Instalação de GMG – Próprio (permanente)">Instalação de GMG – Próprio (permanente)</SelectItem>
                    <SelectItem value="Limpeza de Tanque">Limpeza de Tanque</SelectItem>
                    <SelectItem value="Troca de Bateria">Troca de Bateria</SelectItem>
                    <SelectItem value="Manutenção Mensal (complementar)">Manutenção Mensal (complementar)</SelectItem>
                    <SelectItem value="Regulagem de Válvulas">Regulagem de Válvulas</SelectItem>
                    <SelectItem value="Revisão/Calibração de Bomba Injetora">Revisão/Calibração de Bomba Injetora</SelectItem>
                    <SelectItem value="Entrega/Retirada de GMG">Entrega/Retirada de GMG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="overdue">Atrasada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
                placeholder="Observações sobre a manutenção..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleEditSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractMaintenancesList;
