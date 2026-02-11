import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { maintenancesApi } from "@/services/api";
import { API_BASE_URL } from '@/config/api.config';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/utils/toastManager";
import { formatDateSafe } from '@/utils/formatters';
import {
  Plus,
  Search,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit3,
  Calendar as CalendarIcon,
  MapPin,
} from "lucide-react";
import { apiFetch } from "@/services/api";
import { MaintenanceKanbanCard } from "@/components/MaintenanceKanbanCard";
import { ServiceDetailsModal } from "@/components/ServiceDetailsModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { MaintenancesSkeleton } from "@/components/LoadingStates";
import { useMaintenanceFilters } from "@/hooks/useMaintenanceFilters";
import { useMaintenanceSync } from "@/hooks/useMaintenanceSync";
import { useMaintenanceStatusSync } from "@/hooks/useMaintenanceStatusSync";
import { useMobileViewport } from "@/lib/mobile";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface Service {
  id: string;
  service_name: string;
  description?: string;
  frequency: string;
}

interface Region {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

interface Maintenance {
  id: string;
  contract_id: string;
  contract_number?: string;
  client_name: string;
  maintenance_type: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time?: string;
  technician: string;
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  observations: string;
  created_at: string;
  type: string;
  description: string;
  notes: string;
  priority: string;
  estimated_duration: number;
  equipment_id: string;
  updated_at?: string;
  contract_services?: Service[];
  // Status fields from maintenance_status table
  status_id?: string;
  status_name?: string;
  status_color?: string;
  // Region field
  region_id?: string;
}

const normalizeTimeForSchedule = (value?: string) => {
  if (!value) return "00:00";
  const parts = value.split(":");
  if (parts.length >= 2) {
    const hours = parts[0]?.padStart(2, "0") ?? "00";
    const minutes = parts[1]?.padStart(2, "0") ?? "00";
    return `${hours}:${minutes}`;
  }
  return value;
};

const getScheduledDateTime = (maintenance: Maintenance): Date | null => {
  if (!maintenance?.scheduled_date) return null;

  const datePart = maintenance.scheduled_date.includes("T")
    ? maintenance.scheduled_date.split("T")[0]
    : maintenance.scheduled_date;

  const timePart = normalizeTimeForSchedule(maintenance.scheduled_time);
  const isoCandidate = `${datePart}T${timePart}`;

  const parsed = new Date(isoCandidate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(`${datePart}T${timePart}:00`);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

const isEligibleContractStatus = (status?: string | null) => {
  if (!status) return true;
  const normalized = status.toString().trim().toLowerCase();
  return [
    'active',
    'ativo',
    'renewal',
    'renovacao',
    'renovação',
    'renovation',
    'vigente',
    'in_progress',
    'em andamento',
    'pending',
    'pendente',
    'draft'
  ].includes(normalized);
};

const Maintenances = () => {
  const { session, loading: authLoading } = useAuth();

  // Auto-sync de status atrasados
  useMaintenanceStatusSync();
  const { isMobile } = useMobileViewport();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [clients, setClients] = useState<unknown[]>([]);
  const [clientContracts, setClientContracts] = useState<unknown[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [formData, setFormData] = useState({
    contract_id: "",
    contract_number: "",
    client_name: "",
    maintenance_type: "",
    scheduled_date: "",
    scheduled_time: "09:00",
    end_time: "",
    technician: "",
    observations: "",
    region_id: "",
  });

  // Carregar todas as manutenções via Backend API (consistente com dashboard)
  const loadMaintenances = async () => {
    try {
      // Use AuthContext session - it's already validated
      if (!session?.access_token) {
        console.log(
          "⏳ [Maintenances] Aguardando autenticação via AuthContext...",
        );
        setIsLoading(false);
        return;
      }

      console.log("✅ [Maintenances] Sessão válida via AuthContext");

      // Use Backend API (same as dashboard) - already filtered by user
      const maintenancesResponse = await fetch(
        `${API_BASE_URL}/api/maintenances`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!maintenancesResponse.ok) {
        console.error(
          "Erro ao carregar manutenções via API:",
          maintenancesResponse.status,
        );
        return;
      }

      const maintenancesData = await maintenancesResponse.json();
      console.log(
        "✅ [Maintenances] Manutenções carregadas via Backend API:",
        maintenancesData.length,
      );

      // DEBUG: Log das primeiras 3 manutenções para verificar formato de data
      if (maintenancesData.length > 0) {
        console.log("🔍 [DEBUG] Primeiras 3 manutenções (dados brutos da API):",
          maintenancesData.slice(0, 3).map((m: unknown) => ({
            id: m.id,
            scheduled_date: m.scheduled_date,
            scheduled_date_type: typeof m.scheduled_date,
            client_name: m.client_name
          }))
        );
      }

      if (maintenancesData && Array.isArray(maintenancesData)) {
        const now = new Date();

        const processedMaintenances = maintenancesData.map((maintenance: unknown) => {
          // Check if maintenance is overdue
          const scheduledDateTime = new Date(
            maintenance.scheduled_date +
              "T" +
              (maintenance.scheduled_time || "09:00"),
          );
          const isOverdue =
            maintenance.status === "scheduled" && scheduledDateTime < now;

          // Map backend data to frontend format
          let frontendStatus: Maintenance["status"] = "pending";

          if (isOverdue) {
            frontendStatus = "overdue";
          } else {
            switch (maintenance.status) {
              case "scheduled":
                frontendStatus = "pending";
                break;
              case "in_progress":
                frontendStatus = "in_progress";
                break;
              case "completed":
                frontendStatus = "completed";
                break;
              case "cancelled":
                frontendStatus = "cancelled";
                break;
              case "overdue":
                frontendStatus = "overdue";
                break;
              default:
                frontendStatus = "pending";
                break;
            }
          }

          // IMPORTANTE: Garantir que scheduled_date permanece como string YYYY-MM-DD
          const scheduledDateStr = String(maintenance.scheduled_date || "");

          const processed = {
            id: maintenance.id,
            contract_id: maintenance.contract_id || "",
            contract_number: maintenance.contract_number || "",
            client_name: maintenance.client_name || "",
            maintenance_type: maintenance.type || "",
            scheduled_date: scheduledDateStr,
            scheduled_time: maintenance.scheduled_time || "09:00",
            end_time: maintenance.end_time || "",
            technician: maintenance.technician || "",
            status: frontendStatus,
            observations: maintenance.notes || "",
            created_at: maintenance.created_at,
            type: maintenance.type,
            description: maintenance.description || "",
            notes: maintenance.notes || "",
            priority: maintenance.priority || "medium",
            estimated_duration: maintenance.estimated_duration || 120,
            equipment_id: maintenance.equipment_id || "",
            contract_services: [], // Will be loaded separately if needed
            // Include status_id and status info for proper display
            status_id: maintenance.status_id || "",
            status_name: maintenance.status_name || "",
            status_color: maintenance.status_color || "",
            // Include region_id for proper region display
            region_id: maintenance.region_id || "",
          };

          // DEBUG: Log se a data foi alterada
          if (maintenance.scheduled_date !== processed.scheduled_date) {
            console.log("⚠️ [DEBUG] Data alterada durante processamento:", {
              original: maintenance.scheduled_date,
              processed: processed.scheduled_date
            });
          }

          return processed;
        });

        // Sort by scheduled date and time (most recent first)
        const sortedMaintenances = processedMaintenances.sort((a, b) => {
          const dateTimeA = new Date(a.scheduled_date + "T" + a.scheduled_time);
          const dateTimeB = new Date(b.scheduled_date + "T" + b.scheduled_time);
          return dateTimeB.getTime() - dateTimeA.getTime(); // Most recent first
        });

        setMaintenances(sortedMaintenances);
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
    }
  };

  // Usar hooks personalizados
  const {
    filters,
    filteredMaintenances: filterHookFiltered,
    updateFilter,
    clearFilters,
    getFilterStats,
  } = useMaintenanceFilters(maintenances);

  const { syncMaintenanceData } = useMaintenanceSync({
    onMaintenanceUpdate: loadMaintenances,
  });

  // Carregar clientes via Backend API (consistente com outras páginas)
  const loadClients = async () => {
    try {
      // Use AuthContext session - it's already validated
      if (!session?.access_token) {
        console.log(
          "⏳ [Maintenances] Aguardando autenticação para carregar clientes...",
        );
        return;
      }

      // Use Backend API - already filtered by user
      const clientsResponse = await fetch(`${API_BASE_URL}/api/clients`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!clientsResponse.ok) {
        console.error(
          "Erro ao carregar clientes via API:",
          clientsResponse.status,
        );
        return;
      }

      const clientsData = await clientsResponse.json();
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  // Carregar regiões via Backend API
  const loadRegions = async () => {
    try {
      const data = await apiFetch<Region[]>("/api/regions");
      setRegions((data || []).filter(r => r.is_active));
    } catch (error) {
      console.error("Erro ao carregar regiões:", error);
    }
  };

  // Carregar contratos do cliente selecionado via Backend API
  const loadClientContracts = async (clientId: string) => {
    try {
      // Use AuthContext session - it's already validated
      if (!session?.access_token) {
        console.log(
          "⏳ [Maintenances] Aguardando autenticação para carregar contratos...",
        );
        return;
      }

      // Use Backend API - already filtered by user
      const contractsResponse = await fetch(
        `${API_BASE_URL}/api/contracts`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!contractsResponse.ok) {
        console.error(
          "Erro ao carregar contratos via API:",
          contractsResponse.status,
        );
        return;
      }

      const contractsData = await contractsResponse.json();

      // Filter contracts for the selected client and active status
      const filteredContracts = contractsData.filter((contract: unknown) => {
        if (!contract || !contract.client_id) return false;
        if (contract.client_id !== clientId) return false;
        return isEligibleContractStatus(contract.status);
      });

      setClientContracts(filteredContracts || []);
    } catch (error) {
      console.error("Erro ao carregar contratos:", error);
    }
  };

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedContractId(""); // Reset contract selection
    const selectedClient = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_name: selectedClient?.name || "",
      contract_id: "", // Reset contract data
      contract_number: "", // Reset contract number
      region_id: selectedClient?.region_id || "", // Auto-inherit region from client
    }));

    if (clientId) {
      loadClientContracts(clientId);
    } else {
      setClientContracts([]);
    }
  };

  // Handle contract selection
  const handleContractChange = (contractId: string) => {
    setSelectedContractId(contractId);
    const selectedContract = clientContracts.find((c) => c.id === contractId);
    setFormData((prev) => ({
      ...prev,
      contract_id: contractId, // Store the actual contract ID
      contract_number: selectedContract?.contract_number || "", // Add contract number field
    }));
  };

  useEffect(() => {
    // Only load data when we have a valid session from AuthContext
    if (session?.access_token && !authLoading) {
      console.log("✅ [Maintenances] AuthContext pronto, carregando dados...");
      loadMaintenances();
      loadClients();
    } else if (!authLoading && !session) {
      console.log("⚠️ [Maintenances] Nenhuma sessão encontrada no AuthContext");
      setIsLoading(false);
    }
  }, [session, authLoading]);

  // Load regions immediately - apiFetch uses localStorage token directly
  // This ensures regions are loaded even if AuthContext has timing issues
  useEffect(() => {
    loadRegions();
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setFormData({
        contract_id: "",
        contract_number: "",
        client_name: "",
        maintenance_type: "",
        scheduled_date: "",
        scheduled_time: "09:00",
        end_time: "",
        technician: "",
        observations: "",
        region_id: "",
      });
      setSelectedClientId("");
      setSelectedContractId("");
      setClientContracts([]);
      setDatePickerOpen(false); // Reset date picker state
    }
  }, [isDialogOpen]);

  // Auto-calculate end_time when dialog opens with default scheduled_time
  useEffect(() => {
    if (isDialogOpen && formData.scheduled_time && formData.end_time === "") {
      // Calculate end_time (+1 hour) when dialog opens
      const [hours, minutes] = formData.scheduled_time.split(':').map(Number);
      const endHour = hours + 1;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      setFormData(prev => ({
        ...prev,
        end_time: endTime
      }));
    }
  }, [isDialogOpen, formData.scheduled_time, formData.end_time]);

  // Sincronização em tempo real com atualização forçada
  useRealtimeSync({
    onDataUpdate: () => {
      console.log(
        "Recarregando manutenções devido a mudança na base de dados...",
      );
      loadMaintenances();
    },
    tables: ["maintenances", "contracts", "clients"],
    showNotifications: true,
  });

  // Listener para atualizações de manutenção via evento customizado
  useEffect(() => {
    const handleMaintenanceUpdate = (event: CustomEvent) => {
      console.log("Evento de atualização de manutenção recebido:", event.detail);
      loadMaintenances();
    };

    window.addEventListener('maintenanceUpdated', handleMaintenanceUpdate as EventListener);

    return () => {
      window.removeEventListener('maintenanceUpdated', handleMaintenanceUpdate as EventListener);
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Auto-calculate end_time when scheduled_time changes
    if (name === 'scheduled_time' && value) {
      const [hours, minutes] = value.split(':').map(Number);
      const endHour = hours + 1;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
        end_time: endTime, // Automatically set end_time to +1 hour
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!selectedClientId) {
      toast({
        title: "Cliente obrigatório",
        description: "Por favor, selecione um cliente.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!selectedContractId) {
      toast({
        title: "Contrato obrigatório",
        description: "Por favor, selecione um contrato para associar à manutenção.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.maintenance_type) {
      toast({
        title: "Tipo de manutenção obrigatório",
        description: "Por favor, selecione o tipo de manutenção.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.scheduled_date) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione a data da manutenção.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.end_time) {
      toast({
        title: "Horário fim obrigatório",
        description: "Por favor, informe o horário de término da manutenção.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validar que horário fim é posterior ao horário início
    if (formData.scheduled_time && formData.end_time) {
      const [startHour, startMin] = formData.scheduled_time.split(':').map(Number);
      const [endHour, endMin] = formData.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        toast({
          title: "Horário inválido",
          description: "O horário de término deve ser posterior ao horário de início.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    // Validate date and time are not in the past
    const scheduledDateTime = new Date(
      `${formData.scheduled_date}T${formData.scheduled_time}`,
    );
    const now = new Date();

    // Check if scheduled date is in the past
    if (scheduledDateTime < now) {
      // Auto-set status to overdue if date is in the past
      console.warn(
        "Data agendada no passado, marcando como atrasada automaticamente",
      );
    }

    try {
      // Get the actual contract data from the selected contract
      const selectedContract = clientContracts.find(
        (c) => c.id === selectedContractId,
      );
      const selectedClient = clients.find((c) => c.id === selectedClientId);

      // Prepare data for the backend API
      const maintenanceData = {
        contract_id: selectedContractId, // Use the actual contract ID
        client_id: selectedContract?.client_id || selectedClientId,
        type: formData.maintenance_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        end_time: formData.end_time, // Agora é obrigatório, validado anteriormente
        technician: formData.technician,
        status: scheduledDateTime < now ? "overdue" : "scheduled",
        notes: formData.observations,
        description: `Manutenção ${formData.maintenance_type} agendada para ${selectedClient?.name || formData.client_name}`,
        client_name: selectedClient?.name || formData.client_name,
        contract_number: selectedContract?.contract_number || "",
        priority: "medium",
        region_id: formData.region_id || null, // Região opcional
      };

      console.log('🔍 [DEBUG] Dados de manutenção sendo enviados:', {
        scheduled_date: maintenanceData.scheduled_date,
        scheduled_time: maintenanceData.scheduled_time,
        end_time: maintenanceData.end_time,
        end_time_type: typeof maintenanceData.end_time
      });
      console.log('🔍 [DEBUG] Payload COMPLETO:', JSON.stringify(maintenanceData, null, 2));

      // Use the backend API instead of direct Supabase call
      const apiResponse = await maintenancesApi.create(maintenanceData);

      console.log('🔍 [DEBUG] Dados RETORNADOS pela API:', JSON.stringify(apiResponse, null, 2));
      console.log('🔍 [DEBUG] end_time RETORNADO:', apiResponse?.end_time);

      if (!apiResponse || !apiResponse.id) {
        toast({
          title: "Erro ao agendar manutenção",
          description: "Não foi possível salvar a manutenção. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (apiResponse) {
        const scheduledOnWeekend = Boolean(apiResponse?.scheduled_on_weekend);
        const newMaintenance: Maintenance = {
          id: apiResponse.id,
          contract_id: selectedContractId, // Use the actual contract ID
          contract_number: selectedContract?.contract_number || "", // Add contract number
          client_name: selectedClient?.name || formData.client_name,
          maintenance_type: apiResponse.type,
          scheduled_date: apiResponse.scheduled_date || "",
          scheduled_time: apiResponse.scheduled_time || "09:00",
          end_time: apiResponse.end_time || "", // ✅ Campo end_time extraído da resposta da API
          technician: apiResponse.technician || "",
          status: apiResponse.status || (scheduledDateTime < now ? "overdue" : "scheduled"),
          observations: apiResponse.notes || "",
          created_at: apiResponse.created_at,
          type: apiResponse.type,
          description: apiResponse.description || "",
          notes: apiResponse.notes || "",
          priority: apiResponse.priority || "medium",
          estimated_duration: apiResponse.estimated_duration || 120,
          equipment_id: apiResponse.equipment_id || "",
          region_id: apiResponse.region_id || formData.region_id || "", // ✅ Campo region_id
        };

        setMaintenances((prev) => [newMaintenance, ...prev]);
        setIsDialogOpen(false);

        // Reset form and selections
        setFormData({
          contract_id: "",
          contract_number: "",
          client_name: "",
          maintenance_type: "",
          scheduled_date: "",
          scheduled_time: "09:00",
          end_time: "",
          technician: "",
          observations: "",
          region_id: "",
        });
        setSelectedClientId("");
        setSelectedContractId("");
        setClientContracts([]);

        toast({
          title: "Manutenção agendada",
          description: scheduledOnWeekend
            ? "Manutenção agendada com sucesso para o final de semana. Ajuste o plano operacional conforme necessário."
            : "Manutenção foi agendada com sucesso!",
        });
      }
    } catch (error: unknown) {
      console.error("Erro inesperado:", error);
      const errorMessage = error?.message || error?.detail || "Ocorreu um erro inesperado. Tente novamente.";
      toast({
        title: "Erro ao agendar manutenção",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Maintenance["status"]) => {
    try {
      console.log(`🔄 [Maintenances] Atualizando status da manutenção ${id} para: ${newStatus}`);

      const targetMaintenance = maintenances.find((m) => m.id === id);
      if (!targetMaintenance) {
        toast({
          title: "Manutenção não encontrada",
          description: "Recarregue a página e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const requiresScheduleValidation = newStatus === "overdue" || newStatus === "pending";
      const scheduledDateTime = getScheduledDateTime(targetMaintenance);

      if (requiresScheduleValidation && !scheduledDateTime) {
        toast({
          title: "Dados incompletos",
          description: "Não foi possível validar a data/hora desta manutenção. Edite a manutenção ou atualize a página antes de alterar o status.",
          variant: "destructive",
        });
        return;
      }

      const now = new Date();

      if (scheduledDateTime) {
        if (newStatus === "overdue" && scheduledDateTime > now) {
          toast({
            title: "Status inválido",
            description: "Só é possível marcar como atrasada quando a data e o horário já passaram. Ajuste a agenda antes de continuar.",
            variant: "destructive",
          });
          return;
        }

        if (newStatus === "pending" && scheduledDateTime < now) {
          toast({
            title: "Status inválido",
            description: "Manutenções com data ou horário no passado não podem voltar para pendente. Reagende a manutenção para uma data futura.",
            variant: "destructive",
          });
          return;
        }
      }

      const dbStatus =
        newStatus === "pending"
          ? "pending"
          : newStatus === "in_progress"
            ? "in_progress"
            : newStatus === "completed"
              ? "completed"
              : newStatus === "cancelled"
                ? "cancelled"
                : newStatus === "overdue"
                  ? "overdue"
                  : "scheduled";

      console.log(`📊 [Maintenances] Mapeamento de status: ${newStatus} → ${dbStatus}`);

      const response = await fetch(`${API_BASE_URL}/api/maintenances/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: dbStatus })
      });

      const rawBody = await response.text();
      let payload: unknown = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch (parseError) {
          console.warn("Não foi possível converter resposta em JSON:", parseError);
        }
      }

      if (!response.ok) {
        const errorMessage = payload?.detail || payload?.message || payload?.error || 'Não foi possível atualizar o status da manutenção.';
        console.error("Erro ao atualizar status:", errorMessage);
        toast({
          title: "Erro ao atualizar status",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setMaintenances((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: newStatus, updated_at: new Date().toISOString() }
            : m,
        ),
      );

      await loadMaintenances();

      const statusLabels = {
        pending: "Pendente",
        in_progress: "Em Andamento",
        completed: "Concluída",
        overdue: "Atrasada",
        cancelled: "Cancelada",
      } as const;

      toast({
        title: "Status atualizado",
        description: `Manutenção marcada como: ${statusLabels[newStatus]}`,
      });

      window.dispatchEvent(new CustomEvent('maintenanceUpdated', {
        detail: { maintenanceId: id, newStatus }
      }));
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da manutenção.",
        variant: "destructive",
      });
    }
  };

  const searchFilteredMaintenances = maintenances.filter(
    (maintenance) =>
      maintenance.client_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      maintenance.contract_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      maintenance.technician
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      maintenance.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Combine both filters
  const filteredMaintenances = searchTerm
    ? searchFilteredMaintenances
    : filterHookFiltered;

  const getStatusBadge = (status: Maintenance["status"]) => {
    const config = {
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        label: "Pendente",
      },
      in_progress: {
        variant: "default" as const,
        icon: Wrench,
        label: "Em Andamento",
      },
      completed: {
        variant: "outline" as const,
        icon: CheckCircle,
        label: "Concluída",
      },
      overdue: {
        variant: "destructive" as const,
        icon: AlertTriangle,
        label: "Atrasada",
      },
      cancelled: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Cancelada",
      },
    };

    // Verificar se o status existe no config, caso contrário usar 'pending' como fallback
    const statusConfig = config[status] || config.pending;
    const { variant, icon: Icon, label } = statusConfig;

    return (
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </Badge>
    );
  };

  // Formatar data SEM conversão de timezone (manipulação pura de strings)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    // Se já está no formato DD/MM/YYYY, retornar como está
    if (dateString.includes('/')) return dateString;

    // Extrair apenas a parte da data (YYYY-MM-DD) se vier com timestamp
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;

    // Dividir em partes e reformatar para DD/MM/YYYY (SEM criar Date object)
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    return dateString; // Fallback
  };

  const getStats = () => {
    const now = new Date();

    // Recalculate overdue maintenances based on current date/time
    const overdueCount = maintenances.filter((m) => {
      if (m.status === "overdue") return true;
      if (m.status !== "pending") return false;

      const scheduledDateTime = new Date(
        m.scheduled_date + "T" + (m.scheduled_time || "09:00"),
      );
      return scheduledDateTime < now;
    }).length;

    return {
      total: maintenances.length,
      pending: maintenances.filter((m) => {
        if (m.status !== "pending") return false;
        const scheduledDateTime = new Date(
          m.scheduled_date + "T" + (m.scheduled_time || "09:00"),
        );
        return scheduledDateTime >= now;
      }).length,
      in_progress: maintenances.filter((m) => m.status === "in_progress")
        .length,
      completed: maintenances.filter((m) => m.status === "completed").length,
      overdue: overdueCount,
    };
  };

  const stats = getStats();

  if (isLoading) {
    return <MaintenancesSkeleton />;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Manutenções
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie o cronograma de manutenções
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Nova Manutenção</span>
              <span className="xs:hidden">Nova</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Agendar Nova Manutenção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={handleClientChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contrato *</Label>
                  <Select
                    value={selectedContractId}
                    onValueChange={handleContractChange}
                    disabled={!selectedClientId}
                  >
                    <SelectTrigger className="w-full overflow-hidden">
                      <SelectValue
                        className="truncate"
                        placeholder={
                          selectedClientId
                            ? "Selecione um contrato"
                            : "Primeiro selecione um cliente"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-w-[280px]">
                      {clientContracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id} className="max-w-full">
                          <div className="flex flex-col w-full overflow-hidden">
                            <span className="font-medium truncate text-sm" title={contract.contract_number}>
                              {contract.contract_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {contract.status === "active"
                                ? "Ativo"
                                : "Em Renovação"}
                              {contract.start_date &&
                                contract.end_date &&
                                ` • ${formatDateSafe(contract.start_date)} - ${formatDateSafe(contract.end_date)}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClientId && clientContracts.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum contrato ativo para este cliente
                    </p>
                  )}
                </div>
              </div>

              {/* Region Select - Optional, auto-inherited from client */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Região (opcional)
                </Label>
                <Select
                  value={formData.region_id || "none"}
                  onValueChange={(value) =>
                    handleSelectChange("region_id", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma região (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma região</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: region.color }}
                          />
                          {region.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientId && formData.region_id && (
                  <p className="text-xs text-muted-foreground">
                    Região herdada do cliente (pode ser alterada)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Manutenção *</Label>
                  <Select
                    value={formData.maintenance_type}
                    onValueChange={(value) =>
                      handleSelectChange("maintenance_type", value)
                    }
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
                  <Label htmlFor="scheduled_date">Data Agendada *</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_date ? formatDate(formData.scheduled_date) : 'Selecione uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_date ? new Date(formData.scheduled_date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setFormData({ ...formData, scheduled_date: `${year}-${month}-${day}` });
                            setDatePickerOpen(false); // Fecha o calendário após selecionar
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Horário Início *</Label>
                  <Input
                    id="scheduled_time"
                    name="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={handleInputChange}
                    min={
                      formData.scheduled_date ===
                      new Date().toISOString().split("T")[0]
                        ? new Date().toTimeString().slice(0, 5)
                        : undefined
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Horário Fim *</Label>
                  <Input
                    id="end_time"
                    name="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    min={formData.scheduled_time}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician">Técnico Responsável *</Label>
                  <Input
                    id="technician"
                    name="technician"
                    value={formData.technician}
                    onChange={handleInputChange}
                    placeholder="Nome do técnico"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleInputChange}
                  placeholder="Descrição detalhada da manutenção..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Agendando..." : "Agendar Manutenção"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Wrench className="h-4 w-4 text-primary" />
              <div className="text-center sm:text-left w-full">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total
                </p>
                <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Clock className="h-4 w-4 text-secondary-foreground" />
              <div className="text-center sm:text-left w-full">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Pendentes
                </p>
                <p className="text-lg sm:text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Wrench className="h-4 w-4 text-primary" />
              <div className="text-center sm:text-left w-full">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Em Andamento
                </p>
                <p className="text-lg sm:text-xl font-bold">
                  {stats.in_progress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div className="text-center sm:text-left w-full">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Concluídas
                </p>
                <p className="text-lg sm:text-xl font-bold">
                  {stats.completed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="text-center sm:text-left w-full">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Atrasadas
                </p>
                <p className="text-lg sm:text-xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80 lg:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar manutenções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("Atualizando dados manualmente...");
              loadMaintenances();
              toast({
                title: "Dados atualizados",
                description: "Lista de manutenções recarregada com sucesso!",
              });
            }}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Atualizar Dados</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {filteredMaintenances.length === 0
              ? "Nenhuma manutenção encontrada"
              : `${filteredMaintenances.length} ${filteredMaintenances.length === 1 ? "manutenção" : "manutenções"} encontrada${filteredMaintenances.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* Maintenances Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Wrench className="h-5 w-5" />
            <span>Lista de Manutenções</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredMaintenances.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                {searchTerm
                  ? "Nenhuma manutenção encontrada"
                  : "Nenhuma manutenção agendada"}
              </p>
              <p className="text-sm text-muted-foreground">
                {!searchTerm && "Comece agendando sua primeira manutenção"}
              </p>
            </div>
          ) : (() => {
            const totalPages = Math.ceil(filteredMaintenances.length / ITEMS_PER_PAGE);
            const paginatedItems = filteredMaintenances.slice(
              (currentPage - 1) * ITEMS_PER_PAGE,
              currentPage * ITEMS_PER_PAGE
            );

            return (
              <>
                {isMobile ? (
                  /* Mobile card view */
                  <div className="space-y-3">
                    {paginatedItems.map((maintenance) => {
                      const scheduledDateTime = getScheduledDateTime(maintenance);
                      const now = new Date();
                      return (
                        <Card key={maintenance.id} className="border-l-4 border-l-primary/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {maintenance.contract_number || "S/N"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {maintenance.client_name}
                                </p>
                              </div>
                              {getStatusBadge(maintenance.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                              <div>
                                <span className="text-muted-foreground">Tipo:</span>
                                <p className="font-medium truncate">{maintenance.maintenance_type}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Data:</span>
                                <p className="font-medium">{formatDate(maintenance.scheduled_date)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Técnico:</span>
                                <p className="font-medium truncate">{maintenance.technician || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Horário:</span>
                                <p className="font-medium">{maintenance.scheduled_time}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <MaintenanceKanbanCard
                                maintenance={maintenance}
                                onUpdate={(updated) => {
                                  setMaintenances(prev =>
                                    prev.map(m => m.id === (updated as Maintenance).id ? updated as Maintenance : m)
                                  );
                                  loadMaintenances();
                                }}
                              >
                                <Button size="sm" variant="outline" className="flex-1">
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                              </MaintenanceKanbanCard>
                              {maintenance.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(maintenance.id, "in_progress")}
                                  className="flex-1 bg-primary hover:bg-primary/90"
                                >
                                  Iniciar
                                </Button>
                              )}
                              {maintenance.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(maintenance.id, "completed")}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  Concluir
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Desktop table view */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID/Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Serviços do Contrato</TableHead>
                        <TableHead>Data Agendada</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((maintenance) => {
                        const scheduledDateTime = getScheduledDateTime(maintenance);
                        const now = new Date();
                        const isPastSchedule = scheduledDateTime ? scheduledDateTime.getTime() < now.getTime() : false;
                        const pendingDisabled = isPastSchedule && maintenance.status !== "pending";
                        const overdueDisabled = !isPastSchedule && maintenance.status !== "overdue";

                        return (
                          <TableRow key={maintenance.id} className="hover:bg-muted/50 cursor-pointer">
                            <TableCell>
                              <div>
                                <div className="font-medium">{maintenance.contract_number || "Não informado"}</div>
                                <div className="text-sm text-muted-foreground">{maintenance.client_name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={maintenance.maintenance_type}
                                onValueChange={async (value) => {
                                  try {
                                    const { error } = await supabase
                                      .from("maintenances")
                                      .update({ type: value })
                                      .eq("id", maintenance.id);
                                    if (error) throw error;
                                    setMaintenances((prev) =>
                                      prev.map((m) =>
                                        m.id === maintenance.id ? { ...m, maintenance_type: value, type: value } : m
                                      )
                                    );
                                    toast({ title: "Tipo atualizado", description: `Tipo alterado para: ${value}` });
                                  } catch (error) {
                                    console.error("Erro ao atualizar tipo:", error);
                                    toast({ title: "Erro", description: "Não foi possível atualizar o tipo.", variant: "destructive" });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">{maintenance.maintenance_type}</Badge>
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
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {maintenance.contract_services && maintenance.contract_services.length > 0 ? (
                                  <div className="space-y-1">
                                    {maintenance.contract_services.slice(0, 2).map((service) => (
                                      <Badge key={service.id} variant="secondary" className="text-xs mr-1 mb-1">{service.service_name}</Badge>
                                    ))}
                                    {maintenance.contract_services.length > 2 && (
                                      <ServiceDetailsModal services={maintenance.contract_services} contractNumber={maintenance.contract_number || "Não informado"}>
                                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">+{maintenance.contract_services.length - 2} mais</Badge>
                                      </ServiceDetailsModal>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Nenhum serviço mapeado</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{formatDate(maintenance.scheduled_date)}</div>
                                <div className="text-xs text-muted-foreground">{maintenance.scheduled_time}</div>
                              </div>
                            </TableCell>
                            <TableCell>{maintenance.technician}</TableCell>
                            <TableCell>
                              <Select
                                value={maintenance.status}
                                onValueChange={(value: unknown) => updateStatus(maintenance.id, value)}
                              >
                                <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
                                  <div className="cursor-pointer hover:bg-muted rounded p-1">{getStatusBadge(maintenance.status)}</div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending" disabled={pendingDisabled}>
                                    <div className="flex items-center space-x-2"><Clock className="h-3 w-3" /><span>Pendente</span></div>
                                  </SelectItem>
                                  <SelectItem value="in_progress">
                                    <div className="flex items-center space-x-2"><Wrench className="h-3 w-3" /><span>Em Andamento</span></div>
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    <div className="flex items-center space-x-2"><CheckCircle className="h-3 w-3" /><span>Concluída</span></div>
                                  </SelectItem>
                                  <SelectItem value="overdue" disabled={overdueDisabled}>
                                    <div className="flex items-center space-x-2"><XCircle className="h-3 w-3" /><span>Atrasada</span></div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <MaintenanceKanbanCard
                                  maintenance={maintenance}
                                  onUpdate={(updated) => {
                                    setMaintenances(prev =>
                                      prev.map(m => m.id === (updated as Maintenance).id ? updated as Maintenance : m)
                                    );
                                    loadMaintenances();
                                    toast({ title: "Manutenção atualizada", description: "As alterações foram sincronizadas automaticamente." });
                                  }}
                                >
                                  <Button size="sm" variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                </MaintenanceKanbanCard>
                                {maintenance.status === "pending" && (
                                  <Button size="sm" onClick={() => updateStatus(maintenance.id, "in_progress")} className="bg-primary hover:bg-primary/90">Iniciar</Button>
                                )}
                                {maintenance.status === "in_progress" && (
                                  <Button size="sm" onClick={() => updateStatus(maintenance.id, "completed")} className="bg-green-600 hover:bg-green-700">Concluir</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredMaintenances.length)} de {filteredMaintenances.length}
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          >
                            Anterior
                          </PaginationLink>
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) { pageNum = i + 1; }
                          else if (currentPage <= 3) { pageNum = i + 1; }
                          else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                          else { pageNum = currentPage - 2 + i; }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink isActive={currentPage === pageNum} onClick={() => setCurrentPage(pageNum)} className="cursor-pointer">{pageNum}</PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <PaginationItem><PaginationEllipsis /></PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          >
                            Próxima
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Maintenances;
