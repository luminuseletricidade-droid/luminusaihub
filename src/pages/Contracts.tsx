import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileText, DollarSign, Building2, AlertTriangle, Eye, CheckCircle, Clock, Filter, X, Edit, MessageCircle, Upload, Wrench, Zap, Trash2, Archive, MoreVertical, FolderOpen, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractEditFormExpanded } from '@/components/ContractEditFormExpanded';
import ContractChat from '@/components/ContractChat';
import QuickStatusChanger from '@/components/QuickStatusChanger';
import ContractUpload from '@/components/ContractUpload';
import IntegratedUploadWithAgentsEnhanced from '@/components/IntegratedUploadWithAgentsEnhanced';
import ContractDocumentsWithAgents from '@/components/ContractDocumentsWithAgents';
import ContractDataEdit from '@/components/ContractDataEdit';
import ContractMaintenancesList from '@/components/ContractMaintenancesList';
import ClientFolder from '@/components/ClientFolder';
import { ContractDetailsView } from '@/components/ContractDetailsView';
import { normalizeFromDb, isUuid, normalizeServicesForSave } from '@/lib/contractNormalizer';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useContractsByClient } from '@/hooks/useContractsByClient';
import { ContractsSkeleton } from '@/components/LoadingStates';
import { API_BASE_URL } from '@/config/api.config';
import { ContractErrorBoundary, ContractErrorFallback } from '@/components/ContractErrorBoundary';
import { ContractLoadingFallback } from '@/components/ContractLoadingFallback';
import { formatDateSafe } from '@/utils/formatters';
import { DatePicker } from '@/components/ui/date-picker';
interface ContractData {
  id: string;
  contract_number: string;
  client: {
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    address: string;
  };
  contract_type: 'maintenance' | 'rental' | 'hybrid';
  start_date: string;
  end_date: string;
  value: number;
  status: 'active' | 'inactive' | 'expired' | 'renewal' | 'draft';
  equipment: {
    type: string;
    model: string;
    identification: string;
    location: string;
  };
  services?: string[];
  maintenance_count?: number;
  operational_status?: 'on_schedule' | 'delayed' | 'pending';
  next_maintenance?: string | null;
  alerts?: string[];
  created_at?: string;
  updated_at?: string;
  description?: string;
  client_id?: string;
}
interface DeleteContractState {
  contractId: string | null;
  deleteClient: boolean;
}

interface Filters {
  status: string[];
  contract_type: string[];
  operational_status: string[];
  dateFrom: string;
  dateTo: string;
  valueFrom: string;
  valueTo: string;
  sortBy: 'recent' | 'oldest' | 'expiring' | 'value_high' | 'value_low';
}
const getStatusBadge = (status: ContractData['status']) => {
  const variants = {
    active: 'default',
    inactive: 'secondary',
    expired: 'destructive',
    renewal: 'secondary',
    draft: 'outline'
  } as const;
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    expired: 'Vencido',
    renewal: 'Renovação',
    draft: 'Rascunho'
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
};
const getTypeBadge = (type: ContractData['contract_type']) => {
  const labels = {
    maintenance: 'Manutenção',
    rental: 'Locação',
    hybrid: 'Híbrido'
  };
  return <Badge variant="outline">{labels[type]}</Badge>;
};
const getOperationalStatusIcon = (status: ContractData['operational_status']) => {
  switch (status) {
    case 'on_schedule':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'delayed':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};
const getOperationalStatusText = (status: ContractData['operational_status']) => {
  switch (status) {
    case 'on_schedule':
      return 'OS em dia';
    case 'delayed':
      return 'OS atrasadas';
    case 'pending':
      return 'OS pendente';
    default:
      return 'Pendente';
  }
};
const Contracts = () => {
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [filters, setFilters] = useState<Filters>({
    status: [],
    contract_type: [],
    operational_status: [],
    dateFrom: '',
    dateTo: '',
    valueFrom: '',
    valueTo: '',
    sortBy: 'recent'
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showIntegratedUpload, setShowIntegratedUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'folders' | 'list'>('folders');
  const [chatContract, setChatContract] = useState<ContractData | null>(null);
  const [contractToDelete, setContractToDelete] = useState<DeleteContractState>({ contractId: null, deleteClient: false });
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const normalizeContractServices = useCallback((services: unknown): string[] => {
    if (!services) return [];

    const normalize = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      if (Array.isArray(value)) {
        // Flatten nested arrays
        return value.map(item => normalize(item)).filter(Boolean).join(', ');
      }
      if (typeof value === 'object') {
        if ('name' in value && typeof value.name === 'string') {
          return value.name;
        }
        if ('service' in value && typeof value.service === 'string') {
          return value.service;
        }
        if ('descricao' in value && typeof value.descricao === 'string') {
          return value.descricao;
        }
        try {
          return JSON.stringify(value);
        } catch (error) {
          console.warn('⚠️ [Contracts] Não foi possível serializar serviço do contrato:', error);
          return null;
        }
      }
      return null;
    };

    try {
      if (Array.isArray(services)) {
        return services
          .map(item => normalize(item))
          .filter((item): item is string => Boolean(item))
          .map(item => item.trim());
      }

      if (typeof services === 'string') {
        const parsed = JSON.parse(services);
        if (Array.isArray(parsed)) {
          return parsed
            .map(item => normalize(item))
            .filter((item): item is string => Boolean(item));
        }

        const single = normalize(parsed);
        return single ? [single] : [];
      }
    } catch (error) {
      console.warn('⚠️ [Contracts] Falha ao normalizar serviços:', error);
    }

    return [];
  }, []);

  // Load contracts from Backend API (consistent with dashboard) - moved here to avoid initialization error
  const loadContracts = useCallback(async () => {
    try {
      setIsLoading(true);

      // Use AuthContext session - it's already validated
      if (!session?.access_token) {
        console.log('⏳ [Contracts] Aguardando autenticação via AuthContext...');
        setIsLoading(false);
        return undefined;
      }
      
      console.log('✅ [Contracts] Sessão válida via AuthContext');

      console.log('🔍 [Contracts] Carregando contratos via Backend API...');
      
      // Use Backend API (same as dashboard) - already filtered by user
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!contractsResponse.ok) {
        throw new Error('Erro ao carregar contratos via API');
      }
      
      const contractsData = await contractsResponse.json();
      console.log('📊 [Contracts] Dados carregados via API:', contractsData?.length, 'contratos');

      // Buscar manutenções via API também
      const maintenancesResponse = await fetch(`${API_BASE_URL}/api/maintenances`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const allMaintenances = maintenancesResponse.ok ? await maintenancesResponse.json() : [];

      console.log('🔧 [Contracts] Manutenções carregadas:', allMaintenances?.length || 0);

      // Buscar documentos dos contratos via Supabase
      const { data: allDocuments, error: docsError } = await supabase
        .from('contract_documents')
        .select('*');

      if (docsError) {
        console.warn('⚠️ Erro ao carregar documentos dos contratos:', docsError);
      }

      const documentsByContractId = new Map();
      (allDocuments || []).forEach((doc: unknown) => {
        if (!documentsByContractId.has(doc.contract_id)) {
          documentsByContractId.set(doc.contract_id, []);
        }
        documentsByContractId.get(doc.contract_id).push(doc);
      });

      console.log('📄 [Contracts] Documentos carregados:', allDocuments?.length || 0);

      // Transform data to match our interface (API format may be different)
      const transformedContracts: ContractData[] = (contractsData || []).map((raw) => {
        const contract = normalizeFromDb(raw) as any;
        // API backend já vem com client_name diretamente
        const client = {
          name: contract.client_name || 'Cliente não informado',
          cnpj: contract.client_cnpj || '',
          email: contract.client_email || '',
          phone: contract.client_phone || '',
          address: contract.client_address || ''
        };
        const maintenances = (allMaintenances || []).filter(m => m.contract_id === contract.id);
        
        console.log(`👤 [Contracts] Cliente do contrato ${contract.contract_number}:`, client);

        // Calculate operational status
        const pendingMaintenances = maintenances.filter((m: unknown) => m.status === 'scheduled');
        const overdueMaintenances = maintenances.filter((m: unknown) => m.status === 'scheduled' && new Date(m.scheduled_date) < new Date());
        let operational_status: 'on_schedule' | 'delayed' | 'pending' = 'on_schedule';
        if (overdueMaintenances.length > 0) {
          operational_status = 'delayed';
        } else if (pendingMaintenances.length > 0) {
          operational_status = 'pending';
        }

        // Get next maintenance date
        const nextMaintenance = maintenances.filter((m: unknown) => m.status === 'scheduled' && new Date(m.scheduled_date) > new Date()).sort((a: any, b: unknown) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

        // Ensure contract_type is one of the allowed values
        const contractType = contract.contract_type;
        const validContractType: 'maintenance' | 'rental' | 'hybrid' = contractType === 'maintenance' || contractType === 'rental' || contractType === 'hybrid' ? contractType : 'maintenance';

        // Ensure status is one of the allowed values
        const contractStatus = contract.status;
        const validStatus: 'active' | 'inactive' | 'expired' | 'renewal' | 'draft' = contractStatus === 'active' || contractStatus === 'inactive' || contractStatus === 'expired' || contractStatus === 'renewal' || contractStatus === 'draft' ? contractStatus : 'active';

        // Extrair serviços do campo JSONB services ou usar padrão
        const contractServices = normalizeServicesForSave(contract.services);
        return {
          id: contract.id,
          contract_number: contract.contract_number,
          client_id: contract.client_id,
          client: {
            name: client.name,
            cnpj: client.cnpj,
            email: client.email,
            phone: client.phone,
            address: client.address
          },
          // ✅ ADICIONADO: Campos básicos do contrato
          contract_type: validContractType,
          start_date: contract.start_date || '',
          end_date: contract.end_date || '',
          value: contract.value || 0,
          status: validStatus,

          // ✅ ADICIONADO: Campos de endereço do cliente (para ContractDataEdit)
          client_name: contract.client_name || 'Cliente não informado',
          client_legal_name: contract.client_legal_name || '',
          client_cnpj: contract.client_cnpj || '',
          client_email: contract.client_email || '',
          client_phone: contract.client_phone || '',
          client_address: contract.client_address || '',
          client_neighborhood: contract.client_neighborhood || '',
          client_number: contract.client_number || '',
          client_city: contract.client_city || '',
          client_state: contract.client_state || '',
          client_zip_code: contract.client_zip_code || '',
          client_contact_person: contract.client_contact_person || '',

          // ✅ ADICIONADO: Campos comerciais (para ContractDataEdit)
          payment_terms: contract.payment_terms || '',
          technical_notes: contract.technical_notes || '',
          special_conditions: contract.special_conditions || '',
          warranty_terms: contract.warranty_terms || '',

          // ✅ ADICIONADO: Campos de equipamento
          equipment_type: contract.equipment_type || contract.equipment_brand || 'Gerador',
          equipment_model: contract.equipment_model || contract.equipment_serial || 'Não informado',
          equipment_brand: contract.equipment_brand || '',
          equipment_serial: contract.equipment_serial || '',
          equipment_power: contract.equipment_power || '',
          equipment_voltage: contract.equipment_voltage || '',
          equipment_location: contract.equipment_location || client.address || 'Não informado',
          equipment_year: contract.equipment_year || '',
          equipment_condition: contract.equipment_condition || '',

          // ✅ ADICIONADO: Campos adicionais
          observations: contract.observations || contract.description || '',
          description: contract.description || '',
          maintenance_frequency: contract.maintenance_frequency || '',
          monthly_value: contract.monthly_value || 0,

          // Estrutura legacy para compatibilidade
          equipment: {
            type: contract.equipment_type || contract.equipment_brand || 'Gerador',
            model: contract.equipment_model || contract.equipment_serial || 'Não informado',
            identification: contract.equipment_identification || contract.equipment_serial || contract.id.slice(-6),
            location: contract.equipment_location || client.address || 'Não informado'
          },
          services: contractServices,
          maintenance_count: maintenances.length,
          operational_status,
          next_maintenance: nextMaintenance?.scheduled_date || null,
          alerts: overdueMaintenances.length > 0 ? ['Manutenção em atraso'] : [],
          created_at: contract.created_at,
          updated_at: contract.updated_at || contract.created_at,
          contract_documents: documentsByContractId.get(contract.id) || []
        };
      });
      setContracts(transformedContracts);
      setLoadError(null); // Clear any previous errors
      return transformedContracts; // Return for immediate use in handleContractUpdate
    } catch (error) {
      console.error('Error loading contracts:', error);

      // Set error state for display
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLoadError(new Error(errorMessage));

      // Show toast for user feedback
      toast({
        title: "Erro ao carregar contratos",
        description: errorMessage.includes('404')
          ? "Página de contratos não encontrada. Por favor, recarregue a página."
          : "Não foi possível carregar os contratos. Tente novamente.",
        variant: "destructive"
      });

      // Clear contracts on error
      setContracts([]);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [session, toast, normalizeContractServices]);

  useEffect(() => {
    // Only load contracts when we have a valid session from AuthContext
    if (session?.access_token && !authLoading) {
      console.log('✅ [Contracts] AuthContext pronto, carregando contratos...');
      loadContracts();
    } else if (!authLoading && !session) {
      console.log('⚠️ [Contracts] Nenhuma sessão encontrada no AuthContext');
      setIsLoading(false);
    }
  }, [session, authLoading, loadContracts]);

  // Network reconnection handler - auto-retry when connection is restored
  useEffect(() => {
    const handleNetworkReconnected = () => {
      // Only auto-retry if there was a previous load error
      if (loadError && session?.access_token) {
        console.log('🔄 [Contracts] Conexão restaurada, recarregando contratos...');
        toast({
          title: 'Conexão restaurada',
          description: 'Recarregando contratos...'
        });
        loadContracts();
      }
    };

    window.addEventListener('network-reconnected', handleNetworkReconnected);

    return () => {
      window.removeEventListener('network-reconnected', handleNetworkReconnected);
    };
  }, [loadError, session, loadContracts, toast]);

  // Sincronização em tempo real
  useRealtimeSync({
    onDataUpdate: loadContracts,
    tables: ['contracts', 'clients', 'equipment', 'maintenances'],
    showNotifications: false
  });

  // Filter and sort contracts based on search and filters
  const filteredContracts = contracts.filter(contract => {
    // Tab filter (active/archived) - only apply if no specific status filter is set
    const hasStatusFilter = filters.status.length > 0;
    const matchesTab = hasStatusFilter 
      ? true // If status filter is active, ignore tab filtering  
      : (activeTab === 'active' 
          ? contract.status !== 'inactive' 
          : contract.status === 'inactive');

    // Search filter
    const clientName = contract.client_name || contract.client?.name || '';
    const clientCnpj = contract.client_cnpj || contract.client?.cnpj || '';
    const equipmentId = contract.equipment?.identification || '';
    const matchesSearch = !searchTerm ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientCnpj.includes(searchTerm) ||
      equipmentId.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filters.status.length === 0 || filters.status.includes(contract.status);

    // Contract type filter
    const matchesType = filters.contract_type.length === 0 || filters.contract_type.includes(contract.contract_type);

    // Operational status filter
    const matchesOperational = filters.operational_status.length === 0 || filters.operational_status.includes(contract.operational_status);

    // Date filter
    const matchesDate = (!filters.dateFrom || new Date(contract.start_date) >= new Date(filters.dateFrom)) && (!filters.dateTo || new Date(contract.end_date) <= new Date(filters.dateTo));

    // Value filter
    const monthlyValue = contract.value / 12; // Assuming annual value
    const matchesValue = (!filters.valueFrom || monthlyValue >= parseFloat(filters.valueFrom)) && (!filters.valueTo || monthlyValue <= parseFloat(filters.valueTo));
    return matchesTab && matchesSearch && matchesStatus && matchesType && matchesOperational && matchesDate && matchesValue;
  }).sort((a, b) => {
    // Sort based on selected option
    switch (filters.sortBy) {
      case 'recent':
        return new Date(b.created_at || b.updated_at || '').getTime() - new Date(a.created_at || a.updated_at || '').getTime();
      case 'oldest':
        return new Date(a.created_at || a.updated_at || '').getTime() - new Date(b.created_at || b.updated_at || '').getTime();
      case 'expiring':
        const todayTime = new Date().getTime();
        const aExpiry = new Date(a.end_date).getTime() - todayTime;
        const bExpiry = new Date(b.end_date).getTime() - todayTime;
        return aExpiry - bExpiry;
      case 'value_high':
        return (b.value || 0) - (a.value || 0);
      case 'value_low':
        return (a.value || 0) - (b.value || 0);
      default:
        return 0;
    }
  });

  // Hook para agrupar contratos por cliente
  const {
    contractsByClient,
    clientStats,
    sortedClientNames,
    totalClients
  } = useContractsByClient(filteredContracts);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return formatDateSafe(dateString);
  };

  // Clear all filters and reset to defaults
  const clearFilters = () => {
    setFilters({
      status: [],
      contract_type: [],
      operational_status: [],
      dateFrom: '',
      dateTo: '',
      valueFrom: '',
      valueTo: '',
      sortBy: 'recent'
    });
  };

  // Get contract alerts for display
  const getContractAlerts = (contract: ContractData) => {
    const alerts = [];
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      alerts.push(`Vence em ${daysUntilExpiry} dias`);
    } else if (daysUntilExpiry <= 0) {
      alerts.push('Vencido');
    }
    return alerts.concat(contract.alerts || []);
  };

  const handleArchiveContract = async (contractId: string) => {
    try {
      const {
        error
      } = await supabase.from('contracts').update({
        status: 'inactive'
      }).eq('id', contractId);
      if (error) throw error;

      // Atualizar estado local
      setContracts(prev => prev.map(c => c.id === contractId ? {
        ...c,
        status: 'inactive' as const
      } : c));
      toast({
        title: "Contrato arquivado",
        description: "O contrato foi arquivado com sucesso."
      });
    } catch (error) {
      console.error('Error archiving contract:', error);
      toast({
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar o contrato.",
        variant: "destructive"
      });
    }
  };

  const handleUnarchiveContract = async (contractId: string) => {
    try {
      const {
        error
      } = await supabase.from('contracts').update({
        status: 'active'
      }).eq('id', contractId);
      if (error) throw error;

      // Atualizar estado local
      setContracts(prev => prev.map(c => c.id === contractId ? {
        ...c,
        status: 'active' as const
      } : c));
      toast({
        title: "Contrato desarquivado",
        description: "O contrato foi desarquivado com sucesso."
      });
    } catch (error) {
      console.error('Error unarchiving contract:', error);
      toast({
        title: "Erro ao desarquivar",
        description: "Não foi possível desarquivar o contrato.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteContract = async (contractId: string, deleteClient: boolean = false) => {
    try {
      // Validate user owns this contract before allowing deletion
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar autenticado para excluir contratos",
          variant: "destructive"
        });
        return;
      }

      // Check if user owns this contract
      const { data: contractData, error: contractCheckError } = await supabase
        .from('contracts')
        .select('id, client_id')
        .eq('id', contractId)
        .eq('user_id', user.id)
        .single();

      if (contractCheckError || !contractData) {
        console.error('❌ Erro ao verificar permissão:', contractCheckError);
        toast({
          title: "Erro de permissão",
          description: "Você não tem permissão para excluir este contrato",
          variant: "destructive"
        });
        return;
      }

      // Get contract details to find client_id
      const contractToDeleteData = contracts.find(c => c.id === contractId);
      const clientId = contractData.client_id || contractToDeleteData?.client_id;

      // Log para debug
      console.log('🗑️ Iniciando exclusão do contrato:', contractId);
      console.log('🗑️ Cliente ID:', clientId);
      console.log('🗑️ Excluir cliente também?', deleteClient);
      
      // Primeiro, deletar todos os registros dependentes manualmente
      // (backup caso o CASCADE não funcione)
      
      // 1. Deletar manutenções relacionadas EXPLICITAMENTE
      console.log('🗑️ Deletando manutenções do contrato...');
      const { data: maintenancesToDelete, error: maintenancesQueryError } = await supabase
        .from('maintenances')
        .select('id')
        .eq('contract_id', contractId);
      
      if (maintenancesToDelete && maintenancesToDelete.length > 0) {
        console.log(`🗑️ Encontradas ${maintenancesToDelete.length} manutenções para deletar`);
        const { error: maintenancesError } = await supabase
          .from('maintenances')
          .delete()
          .eq('contract_id', contractId);
        
        if (maintenancesError) {
          console.error('❌ Erro ao deletar manutenções:', maintenancesError);
          throw new Error(`Erro ao deletar manutenções: ${maintenancesError.message}`);
        } else {
          console.log('✅ Manutenções deletadas com sucesso');
        }
      } else {
        console.log('ℹ️ Nenhuma manutenção encontrada para este contrato');
      }

      // 2. Deletar equipamentos relacionados
      console.log('🗑️ Deletando equipamentos do contrato...');
      const { error: equipmentError } = await supabase
        .from('equipment')
        .delete()
        .eq('contract_id', contractId);
      
      if (equipmentError && equipmentError.code !== 'PGRST116') { // Ignorar erro se não houver registros
        console.error('❌ Erro ao deletar equipamentos:', equipmentError);
      } else {
        console.log('✅ Equipamentos processados');
      }

      // 3. Deletar documentos do contrato
      console.log('🗑️ Deletando documentos do contrato...');
      const { error: documentsError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('contract_id', contractId);
      
      if (documentsError && documentsError.code !== 'PGRST116') {
        console.error('❌ Erro ao deletar documentos:', documentsError);
      } else {
        console.log('✅ Documentos processados');
      }

      // 4. Deletar serviços do contrato
      console.log('🗑️ Deletando serviços do contrato...');
      const { error: servicesError } = await supabase
        .from('contract_services')
        .delete()
        .eq('contract_id', contractId);
      
      if (servicesError && servicesError.code !== 'PGRST116') {
        console.error('❌ Erro ao deletar serviços:', servicesError);
      } else {
        console.log('✅ Serviços processados');
      }

      // 5. Deletar planos gerados por IA
      console.log('🗑️ Deletando planos de IA do contrato...');
      const { error: plansError } = await supabase
        .from('ai_generated_plans')
        .delete()
        .eq('contract_id', contractId);
      
      if (plansError && plansError.code !== 'PGRST116') {
        console.error('❌ Erro ao deletar planos de IA:', plansError);
      } else {
        console.log('✅ Planos de IA processados');
      }

      // 6. IMPORTANTE: Deletar o contrato (isso deve acionar CASCADE DELETE automaticamente)
      console.log('🗑️ Deletando o contrato principal...');
      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (contractError) {
        console.error('❌ Erro ao deletar contrato:', contractError);
        throw new Error(`Erro ao deletar contrato: ${contractError.message}`);
      }
      console.log('✅ Contrato deletado com sucesso');

      // 7. Se solicitado, verificar se pode deletar o cliente (lógica multi-tenant)
      if (deleteClient && clientId) {
        console.log('🗑️ Verificando se cliente pode ser deletado...');

        // Verificar quantos usuários têm acesso a este cliente
        const { data: clientRelationships, error: clientRelError } = await supabase
          .from('client_users')
          .select('user_id')
          .eq('client_id', clientId);

        if (clientRelError) {
          console.error('Erro ao verificar relacionamentos do cliente:', clientRelError);
        }

        const clientUserCount = clientRelationships?.length || 0;
        console.log(`👥 Cliente compartilhado com ${clientUserCount} usuário(s)`);

        // Se há mais de um usuário, apenas remover relacionamento do usuário atual
        if (clientUserCount > 1) {
          const { error: removeRelError } = await supabase
            .from('client_users')
            .delete()
            .eq('client_id', clientId)
            .eq('user_id', user.id);

          if (removeRelError) {
            console.error('Erro ao remover relacionamento:', removeRelError);
          } else {
            console.log(`✅ Relacionamento removido. Cliente ainda existe para ${clientUserCount - 1} outro(s) usuário(s)`);
          }
        } else {
          // Se é o único usuário, deletar cliente e todas as manutenções vinculadas
          console.log('🗑️ Único usuário com acesso, deletando cliente completamente...');

          // Primeiro deletar TODAS as manutenções do cliente
          const { data: clientContracts, error: clientContractsError } = await supabase
            .from('contracts')
            .select('id')
            .eq('client_id', clientId);

          if (clientContracts && clientContracts.length > 0) {
            console.log(`🗑️ Cliente tem ${clientContracts.length} contratos`);
            for (const contract of clientContracts) {
              console.log(`🗑️ Deletando manutenções do contrato ${contract.id}...`);
              const { error: maintenanceError } = await supabase
                .from('maintenances')
                .delete()
                .eq('contract_id', contract.id);

              if (maintenanceError) {
                console.error(`❌ Erro ao deletar manutenções do contrato ${contract.id}:`, maintenanceError);
              }
            }
          }

          // Deletar relacionamentos do cliente
          await supabase
            .from('client_users')
            .delete()
            .eq('client_id', clientId);

          // Agora deletar o cliente
          const { error: clientError } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);

          if (clientError) {
            console.error('❌ Erro ao deletar cliente:', clientError);
            throw new Error(`Erro ao deletar cliente: ${clientError.message}`);
          }
          console.log('✅ Cliente e suas manutenções deletados permanentemente');
        }
      }

      // Atualizar estado local
      setContracts(prev => prev.filter(c => c.id !== contractId));

      // Mensagem de sucesso mais detalhada
      const successMessage = deleteClient
        ? "O contrato, cliente e TODAS as manutenções foram excluídos permanentemente."
        : "O contrato e TODAS as manutenções relacionadas foram excluídos permanentemente.";

      toast({
        title: "✅ Exclusão concluída",
        description: successMessage
      });

      console.log('🎉 Processo de exclusão concluído com sucesso!');

      // Recarregar a página após exclusão
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Erro geral na exclusão:', error);
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o contrato e suas dependências.",
        variant: "destructive"
      });
    }
  };
  // Calculate metrics
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
  const expiringContracts = contracts.filter(c => {
    const today = new Date();
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;
  const handleEditContract = () => {
    setIsEditing(true);
  };
  const handleSaveContract = (updatedContract: unknown) => {
    // Update the contract in the local state
    setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
    setSelectedContract(updatedContract);
    setIsEditing(false);
  };

  const handleContractUpdate = async () => {
    // Reload all contracts from backend and get the updated data immediately
    const reloadedContracts = await loadContracts();

    // 🔧 FIX: Update selectedContract with fresh data from the reloaded contracts
    // This ensures the modal displays updated values after save
    if (selectedContract && reloadedContracts) {
      const updatedContract = reloadedContracts.find(c => c.id === selectedContract.id);
      if (updatedContract) {
        setSelectedContract(updatedContract);
        console.log('✅ [Contracts] selectedContract atualizado com dados frescos:', updatedContract.contract_number);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  const handleOpenChat = () => {
    setShowChat(true);
  };
  const handleCloseChat = () => {
    setShowChat(false);
    setIsChatMaximized(false);
  };
  const handleToggleMaximizeChat = () => {
    setIsChatMaximized(!isChatMaximized);
  };
  const handleStatusChange = (contractId: string, newStatus: string, newType: string) => {
    setContracts(prev => prev.map(contract => contract.id === contractId ? {
      ...contract,
      status: newStatus as unknown,
      contract_type: newType as unknown
    } : contract));
  };
  const handleContractExtracted = async (contractData: unknown) => {
    try {
      // Use AuthContext session instead of direct Supabase check
      if (!session?.access_token) {
        console.warn('⚠️ [Contracts] Sessão não disponível via AuthContext');
        toast({
          title: "Erro de autenticação",
          description: "Sessão não encontrada.",
          variant: "destructive"
        });
        return;
      }

      // Use Backend API to get the specific contract
      const contractResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!contractResponse.ok) {
        toast({
          title: "Erro ao carregar contrato",
          description: "Não foi possível carregar os dados do contrato.",
          variant: "destructive"
        });
        return;
      }
      
      const contractsData = await contractResponse.json();
      let contractFound = contractsData.find((c: unknown) => c.id === contractData.id);
      
      // Se não encontrar imediatamente, tentar buscar novamente após um delay maior
      if (!contractFound && contractData.id) {
        console.log('⏳ Contrato não encontrado imediatamente, aguardando 5s e tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Buscar novamente
        const retryResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          contractFound = retryData.find((c: unknown) => c.id === contractData.id);
        }
      }
      
      // Se ainda não encontrar, usar os dados fornecidos diretamente
      if (!contractFound) {
        console.log('⚠️ Contrato ainda não disponível na API, usando dados locais:', contractData);
        // Usar os dados fornecidos diretamente em vez de falhar
        contractFound = {
          ...contractData,
          client_name: contractData.client_name || 'Cliente não identificado',
          contract_type: contractData.contract_type || 'maintenance',
          status: contractData.status || 'draft',
          value: contractData.value || 0,
          services: normalizeContractServices(contractData.services)
        };
      }

      // Buscar dados completos do cliente se tiver client_id
      let clientData: unknown = {
        name: contractFound.client_name || 'Cliente não identificado',
        cnpj: contractFound.client_cnpj || '',
        email: contractFound.client_email || '',
        phone: contractFound.client_phone || '',
        address: contractFound.client_address || '',
        city: contractFound.client_city || '',
        state: contractFound.client_state || '',
        zip_code: contractFound.client_zip_code || ''
      };

      // Se tem client_id, buscar dados completos do cliente
      if (contractFound.client_id) {
        try {
          const { data: fullClient, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', contractFound.client_id)
            .single();

          if (!clientError && fullClient) {
            console.log('✅ Dados completos do cliente carregados:', fullClient);
            // Usar dados do cliente da tabela clients, mas manter dados extraídos se estiverem mais completos
            clientData = {
              name: fullClient.name || contractFound.client_name || 'Cliente não identificado',
              cnpj: fullClient.cnpj || contractFound.client_cnpj || '',
              email: fullClient.email || contractFound.client_email || '',
              phone: fullClient.phone || contractFound.client_phone || '',
              address: fullClient.address || contractFound.client_address || '',
              city: fullClient.city || contractFound.client_city || '',
              state: fullClient.state || contractFound.client_state || '',
              zip_code: fullClient.zip_code || contractFound.client_zip_code || ''
            };
          } else {
            console.warn('⚠️ Erro ao buscar dados do cliente:', clientError);
            // Manter dados extraídos se não conseguir buscar da tabela clients
            clientData = {
              name: contractFound.client_name || 'Cliente não identificado',
              cnpj: contractFound.client_cnpj || '',
              email: contractFound.client_email || '',
              phone: contractFound.client_phone || '',
              address: contractFound.client_address || '',
              city: contractFound.client_city || '',
              state: contractFound.client_state || '',
              zip_code: contractFound.client_zip_code || ''
            };
          }
        } catch (err) {
          console.warn('⚠️ Erro ao buscar dados do cliente:', err);
          // Manter dados extraídos em caso de erro
          clientData = {
            name: contractFound.client_name || 'Cliente não identificado',
            cnpj: contractFound.client_cnpj || '',
            email: contractFound.client_email || '',
            phone: contractFound.client_phone || '',
            address: contractFound.client_address || '',
            city: contractFound.client_city || '',
            state: contractFound.client_state || '',
            zip_code: contractFound.client_zip_code || ''
          };
        }
      }

      // Recarregar contratos e aguardar antes de abrir para edição
      await loadContracts();

      // Aguardar um pouco para garantir que os dados foram completamente carregados no estado
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Buscar novamente o contrato completo do banco para garantir dados atualizados
      if (!isUuid(contractFound.id)) {
        console.warn('⚠️ Contracts.handleContractExtracted: contractFound.id não é UUID, pulando fetch supabase');
      }
      const { data: freshContract, error: freshError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', isUuid(contractFound.id) ? contractFound.id : '00000000-0000-0000-0000-000000000000')
        .single();

      if (freshError || !freshContract) {
        console.error('❌ Erro ao buscar contrato atualizado:', freshError);
        toast({
          title: "Erro ao carregar contrato",
          description: "Não foi possível carregar os dados atualizados do contrato.",
          variant: "destructive"
        });
        setShowUpload(false);
        return;
      }

      console.log('✅ Contrato atualizado carregado do banco:', freshContract);
      console.log('📋 Serviços do contrato:', freshContract.services);

      // Converter para formato ContractData com todos os dados atualizados
      const newContract: ContractData & any = {
        id: freshContract.id,
        contract_number: freshContract.contract_number,
        client_id: freshContract.client_id,
        client: clientData,
        // Flatten client data para compatibilidade com ContractDataEdit
        client_name: clientData.name || freshContract.client_name || '',
        client_legal_name: freshContract.client_legal_name || '',
        client_cnpj: clientData.cnpj || freshContract.client_cnpj || '',
        client_email: clientData.email || freshContract.client_email || '',
        client_phone: clientData.phone || freshContract.client_phone || '',
        client_address: clientData.address || freshContract.client_address || '',
        client_city: clientData.city || freshContract.client_city || '',
        client_state: clientData.state || freshContract.client_state || '',
        client_zip_code: clientData.zip_code || freshContract.client_zip_code || '',
        client_contact_person: freshContract.client_contact_person || '',
        contract_type: freshContract.contract_type as 'maintenance' | 'rental' | 'hybrid' || 'maintenance',
        start_date: freshContract.start_date || '',
        end_date: freshContract.end_date || '',
        value: freshContract.value || 0,
        status: freshContract.status as 'active' | 'inactive' | 'expired' | 'renewal' | 'draft' || 'draft',
        equipment: {
          type: freshContract.equipment_type || 'Não informado',
          model: freshContract.equipment_model || '',
          identification: freshContract.id.slice(-6),
          location: freshContract.equipment_location || ''
        },
        equipment_type: freshContract.equipment_type || '',
        equipment_model: freshContract.equipment_model || '',
        equipment_serial: freshContract.equipment_serial || '',
        equipment_location: freshContract.equipment_location || '',
        equipment_power: freshContract.equipment_power || '',
        equipment_voltage: freshContract.equipment_voltage || '',
        equipment_brand: freshContract.equipment_brand || '',
        equipment_year: freshContract.equipment_year || '',
        equipment_condition: freshContract.equipment_condition || '',
        services: normalizeContractServices(freshContract.services),
        description: freshContract.description || '',
        payment_terms: freshContract.payment_terms || '',
        technical_notes: freshContract.technical_notes || '',
        special_conditions: freshContract.special_conditions || '',
        warranty_terms: freshContract.warranty_terms || '',
        maintenance_frequency: freshContract.maintenance_frequency || '',
        created_at: freshContract.created_at,
        updated_at: freshContract.updated_at,
        alerts: []
      };

      // Validar se contrato tem dados mínimos necessários
      // Verificar se temos dados do cliente válidos (não apenas "Cliente não identificado")
      const hasValidClientData = newContract.client && 
        newContract.client.name && 
        newContract.client.name !== 'Cliente não identificado' &&
        newContract.client.name.trim().length > 0;

      if (!hasValidClientData) {
        console.log('⚠️ Contrato carregado mas dados do cliente ainda sendo processados');
        console.log('📋 Dados do cliente atual:', {
          client: newContract.client,
          client_name: newContract.client_name,
          client_cnpj: newContract.client_cnpj,
          client_email: newContract.client_email
        });
        
        toast({
          title: "Contrato importado",
          description: "Os dados estão sendo processados. Aguarde alguns instantes e recarregue a página.",
          variant: "default"
        });
        setShowUpload(false);
        return;
      }

      setSelectedContract(newContract);
      setIsEditing(true);
      setShowUpload(false);
      toast({
        title: "Contrato carregado!",
        description: "Use 'Extrair dados com IA' para processar o documento automaticamente."
      });
    } catch (error) {
      console.error('Erro ao carregar contrato extraído:', error);
      toast({
        title: "Erro inesperado",
        description: "Erro ao processar o contrato extraído.",
        variant: "destructive"
      });
    }
  };
  const handleOpenContractChat = (contract: ContractData) => {
    setChatContract(contract);
  };
  // Show loading state
  if (isLoading) {
    return <ContractLoadingFallback />;
  }

  // Show error state
  if (loadError) {
    return <ContractErrorFallback error={loadError} onReset={() => {
      setLoadError(null);
      loadContracts();
    }} />;
  }

  // Show auth required state
  if (!session && !authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Autenticação Necessária</h3>
            <p className="text-sm text-muted-foreground">
              Você precisa estar autenticado para visualizar os contratos.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Contratos</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Gerencie contratos de manutenção e locação</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowIntegratedUpload(true)} className="flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 text-xs sm:text-sm">
            <Zap className="h-4 w-4" />
            <span className="hidden xs:inline">Upload Inteligente</span>
            <span className="xs:hidden">Upload</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-metric-medium">{totalContracts}</p>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-metric-medium">{activeContracts}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Valor</p>
                <p className="text-metric-medium">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Expiram</p>
                <p className="text-metric-medium">{expiringContracts}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Active/Archived */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archived')} className="w-full">
        <TabsList className="grid w-full sm:w-64 grid-cols-2">
          <TabsTrigger value="active">Ativos</TabsTrigger>
          <TabsTrigger value="archived">Arquivados</TabsTrigger>
        </TabsList>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-80 lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contratos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant={viewMode === 'folders' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('folders')} className="flex items-center space-x-1 sm:space-x-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Cliente</span>
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="flex items-center space-x-1 sm:space-x-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                {(filters.status.length > 1 || filters.contract_type.length > 0 || filters.operational_status.length > 0 || filters.dateFrom || filters.dateTo || filters.valueFrom || filters.valueTo || filters.sortBy !== 'recent') && <div className="w-2 h-2 bg-primary rounded-full" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-[600px] overflow-y-auto bg-background border border-border" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ordenar por</Label>
                  <div className="space-y-2">
                    {[{
                    value: 'recent',
                    label: 'Mais recentes'
                  }, {
                    value: 'oldest',
                    label: 'Mais antigos'
                  }, {
                    value: 'expiring',
                    label: 'Próximos ao vencimento'
                  }, {
                    value: 'value_high',
                    label: 'Maior valor'
                  }, {
                    value: 'value_low',
                    label: 'Menor valor'
                  }].map(sort => <div key={sort.value} className="flex items-center space-x-2">
                        <Checkbox id={`sort-${sort.value}`} checked={filters.sortBy === sort.value} onCheckedChange={checked => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          sortBy: sort.value as unknown
                        }));
                      }
                    }} />
                        <Label htmlFor={`sort-${sort.value}`} className="text-sm">
                          {sort.label}
                        </Label>
                      </div>)}
                  </div>
                </div>
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status Contrato</Label>
                  <div className="space-y-2">
                    {[{
                    value: 'active',
                    label: 'Ativo'
                  }, {
                    value: 'inactive',
                    label: 'Inativo'
                  }, {
                    value: 'expired',
                    label: 'Vencido'
                  }, {
                    value: 'renewal',
                    label: 'Renovação'
                  }, {
                    value: 'draft',
                    label: 'Rascunho'
                  }].map(status => <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox id={`status-${status.value}`} checked={filters.status.includes(status.value)} onCheckedChange={checked => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          status: [...prev.status, status.value]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status.filter(s => s !== status.value)
                        }));
                      }
                    }} />
                        <Label htmlFor={`status-${status.value}`} className="text-sm">
                          {status.label}
                        </Label>
                      </div>)}
                  </div>
                </div>

                {/* Contract Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Serviço</Label>
                  <div className="space-y-2">
                    {[{
                    value: 'maintenance',
                    label: 'Manutenção'
                  }, {
                    value: 'rental',
                    label: 'Locação'
                  }, {
                    value: 'hybrid',
                    label: 'Híbrido'
                  }].map(type => <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox id={`type-${type.value}`} checked={filters.contract_type.includes(type.value)} onCheckedChange={checked => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          contract_type: [...prev.contract_type, type.value]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          contract_type: prev.contract_type.filter(t => t !== type.value)
                        }));
                      }
                    }} />
                        <Label htmlFor={`type-${type.value}`} className="text-sm">
                          {type.label}
                        </Label>
                      </div>)}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Período</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">De:</Label>
                      <DatePicker
                        id="dateFrom"
                        value={filters.dateFrom}
                        onChangeString={(date) => setFilters(prev => ({
                          ...prev,
                          dateFrom: date
                        }))}
                        allowWeekends={true}
                        placeholder="Data inicial"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateTo" className="text-xs text-muted-foreground">Até:</Label>
                      <DatePicker
                        id="dateTo"
                        value={filters.dateTo}
                        onChangeString={(date) => setFilters(prev => ({
                          ...prev,
                          dateTo: date
                        }))}
                        allowWeekends={true}
                        placeholder="Data final"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} encontrado{filteredContracts.length !== 1 ? 's' : ''}
          </div>
        </div>

        <TabsContent value="active" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} encontrado{filteredContracts.length !== 1 ? 's' : ''}
          </div>
          
          {/* Contracts View */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground">Carregando contratos...</p>
              </div>
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-80" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f) ? 'Nenhum contrato ativo encontrado' : 'Nenhum contrato ativo cadastrado'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f) ? 'Tente ajustar os filtros' : 'Use o Upload Inteligente para criar contratos a partir de PDFs'}
                </p>
                {!searchTerm && !Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f) ? (
                  <Button onClick={() => setShowIntegratedUpload(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Upload Inteligente
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'folders' ? (
            <div className="space-y-4">
              {sortedClientNames.map(clientName => (
                <ClientFolder 
                  key={clientName} 
                  clientName={clientName} 
                  contracts={contractsByClient[clientName]} 
                  onContractSelect={setSelectedContract} 
                  getContractAlerts={getContractAlerts} 
                  onStatusChange={handleStatusChange} 
                  onArchiveContract={handleArchiveContract} 
                  onDeleteContract={(contractId) => setContractToDelete({ contractId, deleteClient: false })} 
                  onOpenChat={handleOpenContractChat} 
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map(contract => {
                const alerts = getContractAlerts(contract);
                const monthlyValue = contract.value / 12;
                return (
                  <Card 
                    key={contract.id} 
                    className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                      alerts.some(a => a.includes('Vence')) ? 'border-l-yellow-500' : 
                      alerts.some(a => a.includes('Vencido')) ? 'border-l-red-500' : 'border-l-green-500'
                    }`} 
                    onClick={() => setSelectedContract(contract)}
                  >
                    <CardContent className="p-6">
                      {/* Company and Period */}
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-2 sm:gap-0">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <h3 className="text-base sm:text-lg font-semibold">{contract.client_name || contract.client?.name || 'Cliente não informado'}</h3>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                        </div>
                      </div>

                      {/* Contract Info and Status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">
                            ID: {contract.contract_number}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                          <QuickStatusChanger 
                            contractId={contract.id} 
                            currentStatus={contract.status === 'draft' ? 'active' : contract.status} 
                            contractType={contract.contract_type} 
                            onStatusChange={(newStatus, newType) => handleStatusChange(contract.id, newStatus, newType)} 
                          />
                        </div>
                      </div>

                      {/* Operational Information */}
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="font-medium">{formatCurrency(monthlyValue)}/mês</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{contract.equipment.type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>{contract.maintenance_count} OSs</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getOperationalStatusIcon(contract.operational_status)}
                            <span className="hidden sm:inline">{getOperationalStatusText(contract.operational_status)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" onClick={e => {
                            e.stopPropagation();
                            setSelectedContract(contract);
                          }} className="flex-1 sm:flex-none">
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Ver</span>
                          </Button>
                          
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {contract.status !== 'inactive' ? (
                                <DropdownMenuItem onClick={e => {
                                  e.stopPropagation();
                                  handleArchiveContract(contract.id);
                                }}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={e => {
                                  e.stopPropagation();
                                  handleUnarchiveContract(contract.id);
                                }}>
                                  <FolderOpen className="h-4 w-4 mr-2" />
                                  Desarquivar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onSelect={e => e.preventDefault()} 
                                className="text-destructive focus:text-destructive"
                                onClick={e => {
                                  e.stopPropagation();
                                  setContractToDelete(contract.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Alerts */}
                      {alerts.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center space-x-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600 font-medium">
                              {alerts.join(', ')}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} arquivado{filteredContracts.length !== 1 ? 's' : ''}
          </div>
          
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Archive className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum contrato arquivado</h3>
                <p className="text-muted-foreground mb-6">
                  Contratos arquivados aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map(contract => {
                const alerts = getContractAlerts(contract);
                const monthlyValue = contract.value / 12;
                return (
                  <Card 
                    key={contract.id} 
                    className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-gray-400 opacity-80" 
                    onClick={() => setSelectedContract(contract)}
                  >
                    <CardContent className="p-6">
                      {/* Company and Period */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-lg font-semibold text-muted-foreground">{contract.client_name || contract.client?.name || 'Cliente não informado'}</h3>
                          <Badge variant="secondary">Arquivado</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                        </div>
                      </div>

                      {/* Contract Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <span>ID: {contract.contract_number}</span>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(monthlyValue)}/mês</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>{contract.equipment.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={e => {
                            e.stopPropagation();
                            setSelectedContract(contract);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => {
                                e.stopPropagation();
                                handleUnarchiveContract(contract.id);
                              }}>
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Desarquivar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onSelect={e => e.preventDefault()} 
                                className="text-destructive focus:text-destructive"
                                onClick={e => {
                                  e.stopPropagation();
                                  setContractToDelete(contract.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contract Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload de Contrato</DialogTitle>
          </DialogHeader>
          <ContractUpload onContractExtracted={handleContractExtracted} onClose={() => setShowUpload(false)} />
        </DialogContent>
      </Dialog>


      {/* Contract Details Modal */}
      <Dialog open={!!selectedContract && !isChatMaximized} onOpenChange={() => {
      if (!isChatMaximized) {
        setSelectedContract(null);
        setIsEditing(false);
        setShowChat(false);
      }
    }}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          {selectedContract && <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">
                      Contrato {selectedContract.contract_number}
                    </DialogTitle>
                    <p className="text-lg text-muted-foreground mt-1">
                      {selectedContract.client?.name || selectedContract.client_name || 'Cliente não informado'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                setSelectedContract(null);
                setIsEditing(false);
                setShowChat(false);
              }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="h-[calc(90vh-120px)]">
                {showChat ? <ContractChat contract={selectedContract} onBack={() => setShowChat(false)} isMaximized={false} onToggleMaximize={() => setIsChatMaximized(true)} /> : <Tabs defaultValue="data" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="data">Dados do Contrato</TabsTrigger>
                      <TabsTrigger value="maintenances">Manutenções</TabsTrigger>
                      <TabsTrigger value="documents">Documentos</TabsTrigger>
                      <TabsTrigger value="chat">Chat IA</TabsTrigger>
                    </TabsList>

                    <TabsContent value="data" className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <ContractDataEdit
                          contractId={selectedContract.id}
                          initialData={selectedContract}
                          onUpdate={handleContractUpdate}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="maintenances" className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <ContractMaintenancesList 
                          contractId={selectedContract.id}
                          contractData={selectedContract}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <ContractDocumentsWithAgents contractId={selectedContract.id} />
                      </div>
                    </TabsContent>

                    <TabsContent value="chat" className="flex-1 h-full overflow-hidden">
                      <div className="h-full">
                        <ContractChat contract={selectedContract} onBack={() => {}} isMaximized={false} onToggleMaximize={() => setIsChatMaximized(true)} />
                      </div>
                    </TabsContent>
                  </Tabs>}
              </div>
            </>}
        </DialogContent>
      </Dialog>

      {/* Integrated Upload Dialog */}
      <IntegratedUploadWithAgentsEnhanced
        isOpen={showIntegratedUpload}
        onClose={() => setShowIntegratedUpload(false)}
        onContractCreated={contractData => {
          handleContractExtracted(contractData);
          setShowIntegratedUpload(false);
        }}
      />

      {/* Maximized Chat */}
      {isChatMaximized && selectedContract && <div className="fixed inset-0 z-50 bg-background">
          <ContractChat contract={selectedContract} onBack={() => {
        setIsChatMaximized(false);
        setShowChat(false);
      }} isMaximized={true} onToggleMaximize={() => setIsChatMaximized(false)} />
        </div>}

      {/* Contract Chat Dialog */}
      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={!!contractToDelete.contractId} onOpenChange={() => setContractToDelete({ contractId: null, deleteClient: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão de Contrato
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  Tem certeza que deseja excluir este contrato permanentemente? 
                  Esta ação não pode ser desfeita e removerá todos os dados relacionados:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Manutenções agendadas</li>
                  <li>Equipamentos cadastrados</li>
                  <li>Documentos anexados</li>
                  <li>Serviços contratados</li>
                  <li>Planos gerados por IA</li>
                </ul>
                
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="delete-client"
                      checked={contractToDelete.deleteClient}
                      onChange={(e) => setContractToDelete({ ...contractToDelete, deleteClient: e.target.checked })}
                      className="mt-1"
                    />
                    <label htmlFor="delete-client" className="text-sm cursor-pointer">
                      <strong>Excluir também o cadastro do cliente</strong>
                      <div className="text-xs text-muted-foreground mt-1">
                        Marque esta opção para remover também o cadastro do cliente associado a este contrato.
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (contractToDelete.contractId) {
                  handleDeleteContract(contractToDelete.contractId, contractToDelete.deleteClient);
                  setContractToDelete({ contractId: null, deleteClient: false });
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {contractToDelete.deleteClient ? 'Excluir Contrato e Cliente' : 'Excluir Contrato'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {chatContract && <Dialog open={!!chatContract} onOpenChange={() => setChatContract(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Chat IA - {chatContract.contract_number}</DialogTitle>
              <DialogDescription>Interface de chat com IA para o contrato {chatContract.contract_number}</DialogDescription>
            </DialogHeader>
            <div className="h-[85vh]">
              <ContractChat contract={chatContract} onBack={() => setChatContract(null)} isMaximized={false} onToggleMaximize={() => {}} />
            </div>
          </DialogContent>
        </Dialog>}
    </div>;
};
// Wrap the component with ErrorBoundary
const ContractsWithErrorBoundary = () => (
  <ContractErrorBoundary>
    <Contracts />
  </ContractErrorBoundary>
);

export default ContractsWithErrorBoundary;
