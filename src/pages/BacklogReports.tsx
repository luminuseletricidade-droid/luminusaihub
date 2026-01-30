import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ListChecks,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Hourglass,
  Search,
  Filter,
  ChevronDown,
  User,
  Download,
  Play,
  RefreshCw,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getApiUrl } from '@/config/api.config';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/utils/toastManager';
import * as XLSX from 'xlsx';

// Dashboard Components (shared)
import KPI from '@/components/dashboard/KPI';
import DetailedStatusCard from '@/components/dashboard/DetailedStatusCard';
import CurvaSChart from '@/components/dashboard/CurvaSChart';
import BacklogTaskCard from '@/components/dashboard/BacklogTaskCard';

// Types & Utils
import type { BacklogTask, BacklogKPIs, CurvaSDataPoint, Status } from '@/components/dashboard/types';
import { mapBacklogDbStatusToAppStatus, formatBacklogDate } from '@/components/dashboard/utils/statusHelper';

// =============================================
// INTERFACES
// =============================================

interface ApiBacklogItem {
  id: string;
  contract_id: string;
  client_name: string;
  contract_number: string;
  maintenance_type_name: string;
  maintenance_type_code: string;
  scheduled_date: string | null;
  completed_date: string | null;
  days_open: number;
  status: string;
  reschedule_count: number;
  progress: number;
  recommendation: string | null;
  technician: string | null;
  notes: string | null;
  is_critical_backlog: boolean;
  is_rescheduled: boolean;
  created_at: string;
  updated_at: string;
  region?: string;
  power_kva?: number;
}

interface ApiBacklogResponse {
  success: boolean;
  data: {
    backlogs: ApiBacklogItem[];
    summary: {
      total_backlogs: number;
      critical_backlogs: number;
      avg_days_open: number;
      total_rescheduled: number;
      max_reschedule_count: number;
    };
  };
}

interface ApiKpisResponse {
  success: boolean;
  data: {
    total_tasks: number;
    critical_count: number;
    on_schedule_count: number;
    rescheduled_count: number;
    avg_days_open: number;
    in_progress_count: number;
    pending_count: number;
  };
}

interface ApiCurvaSResponse {
  success: boolean;
  data: CurvaSDataPoint[];
}

// =============================================
// MAIN COMPONENT
// =============================================

// Progress by Type Interface
interface ProgressByType {
  type_code: string;
  type_name: string;
  planned_count: number;
  completed_count: number;
  progress_percent: number;
}

// Contract Maintenances Interface
interface ContractMaintenance {
  maintenance_id: string;
  type: string;
  type_code: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
}

interface ContractWithMaintenances {
  contract_id: string;
  contract_number: string;
  client_name: string;
  region: string | null;
  power_kva: number | null;
  technician_name: string | null;
  maintenances: ContractMaintenance[];
}

const BacklogReports: React.FC = () => {
  // Auth - mesmo padrão do Maintenances.tsx
  const { session, loading: authLoading } = useAuth();

  const [backlogs, setBacklogs] = useState<BacklogTask[]>([]);
  const [kpis, setKpis] = useState<BacklogKPIs>({
    totalBacklogs: 0,
    criticalBacklogs: 0,
    onSchedule: 0,
    rescheduled: 0,
    avgDaysOpen: 0
  });
  const [curvaSData, setCurvaSData] = useState<CurvaSDataPoint[]>([]);
  const [progressByType, setProgressByType] = useState<ProgressByType[]>([]);
  const [contractsWithMaintenances, setContractsWithMaintenances] = useState<ContractWithMaintenances[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('ALL');
  const [selectedContract, setSelectedContract] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Status | 'ALL'>('ALL');

  // Filter options - populated once on initial load, not affected by filters
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<string[]>([]);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  // Transform API data to BacklogTask format
  const transformBacklogData = useCallback((apiItem: ApiBacklogItem): BacklogTask => {
    const status = mapBacklogDbStatusToAppStatus(apiItem.status, apiItem.scheduled_date);

    return {
      id: apiItem.id,
      contract_id: apiItem.contract_id,
      client: apiItem.client_name,
      code: apiItem.contract_number,
      type: apiItem.maintenance_type_name,
      typeCode: apiItem.maintenance_type_code,
      scheduledDate: apiItem.scheduled_date,
      completedDate: apiItem.completed_date,
      daysOpen: apiItem.days_open,
      status: status,
      dbStatus: apiItem.status,
      rescheduleCount: apiItem.reschedule_count,
      progress: apiItem.progress,
      recommendation: apiItem.recommendation,
      technician: apiItem.technician,
      notes: apiItem.notes,
      isCriticalBacklog: apiItem.is_critical_backlog,
      isRescheduled: apiItem.is_rescheduled,
      createdAt: apiItem.created_at,
      updatedAt: apiItem.updated_at,
      region: apiItem.region,
      powerKVA: apiItem.power_kva
    };
  }, []);

  // Fetch data
  const fetchBacklogs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Use AuthContext session (same as Maintenances.tsx)
      if (!session?.access_token) {
        console.log('⏳ [BacklogReports] Aguardando autenticação via AuthContext...');
        setLoading(false);
        return;
      }
      console.log('✅ [BacklogReports] Sessão válida via AuthContext');

      const params = new URLSearchParams();
      if (selectedYear !== 'ALL') {
        // Calcula o mês de início (selectedMonth é 0-indexed: 0=Jan, 11=Dec)
        const startMonth = selectedMonth !== 'ALL' ? parseInt(selectedMonth) + 1 : 1;
        const startDate = `${selectedYear}-${startMonth.toString().padStart(2, '0')}-01`;

        // Calcula o último dia do mês corretamente (evita datas inválidas como 2024-02-31)
        const endMonth = selectedMonth !== 'ALL' ? parseInt(selectedMonth) + 1 : 12;
        const lastDayOfMonth = new Date(parseInt(selectedYear), endMonth, 0).getDate();
        const endDate = `${selectedYear}-${endMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      if (selectedTechnician !== 'ALL') {
        params.append('technician', selectedTechnician);
      }
      if (selectedContract !== 'ALL') {
        params.append('contract_id', selectedContract);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const [backlogsRes, kpisRes, curvaSRes, progressRes, contractsRes] = await Promise.all([
        fetch(getApiUrl(`/api/reports/backlogs-recorrentes${queryString}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch(getApiUrl(`/api/reports/backlogs-recorrentes/kpis${queryString}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch(getApiUrl(`/api/reports/backlogs-recorrentes/curva-s${queryString}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch(getApiUrl(`/api/reports/backlogs-recorrentes/progress-by-type${queryString}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch(getApiUrl(`/api/reports/backlogs-recorrentes/by-contract${queryString}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        })
      ]);

      if (backlogsRes.ok) {
        const backlogsData: ApiBacklogResponse = await backlogsRes.json();
        if (backlogsData.success && backlogsData.data?.backlogs) {
          const transformedBacklogs = backlogsData.data.backlogs.map(transformBacklogData);
          setBacklogs(transformedBacklogs);

          // Populate filter options only on first load (when no filters applied)
          if (!filterOptionsLoaded && selectedYear === 'ALL' && selectedTechnician === 'ALL') {
            const yearsSet = new Set<string>();
            const techsSet = new Set<string>();
            transformedBacklogs.forEach(b => {
              if (b.scheduledDate) yearsSet.add(new Date(b.scheduledDate).getFullYear().toString());
              if (b.technician) techsSet.add(b.technician);
            });
            yearsSet.add(new Date().getFullYear().toString());
            setAvailableYears(Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a)));
            setAvailableTechnicians(Array.from(techsSet).sort());
            setFilterOptionsLoaded(true);
          }
        }
      }

      if (kpisRes.ok) {
        const kpisData: ApiKpisResponse = await kpisRes.json();
        if (kpisData.success && kpisData.data) {
          setKpis({
            totalBacklogs: kpisData.data.total_tasks || 0,
            criticalBacklogs: kpisData.data.critical_count || 0,
            onSchedule: kpisData.data.on_schedule_count || 0,
            rescheduled: kpisData.data.rescheduled_count || 0,
            avgDaysOpen: kpisData.data.avg_days_open || 0
          });
        }
      }

      if (curvaSRes.ok) {
        const curvaSDataResponse: ApiCurvaSResponse = await curvaSRes.json();
        if (curvaSDataResponse.success && curvaSDataResponse.data) {
          setCurvaSData(curvaSDataResponse.data);
        }
      }

      if (progressRes.ok) {
        const progressDataResponse = await progressRes.json();
        if (progressDataResponse.success && progressDataResponse.data) {
          setProgressByType(progressDataResponse.data);
        }
      }

      if (contractsRes.ok) {
        const contractsDataResponse = await contractsRes.json();
        if (contractsDataResponse.success && contractsDataResponse.data) {
          setContractsWithMaintenances(contractsDataResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching backlog data:', error);
      toast({ title: 'Erro ao carregar dados', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedTechnician, selectedContract, transformBacklogData, session, filterOptionsLoaded]);

  // Carregar dados quando sessão estiver pronta - mesmo padrão do Maintenances.tsx
  useEffect(() => {
    if (session?.access_token && !authLoading) {
      console.log('✅ [BacklogReports] AuthContext pronto, carregando dados...');
      fetchBacklogs();
    } else if (!authLoading && !session) {
      console.log('⚠️ [BacklogReports] Nenhuma sessão encontrada no AuthContext');
      setLoading(false);
    }
  }, [session, authLoading, selectedYear, selectedMonth, selectedTechnician, selectedContract]);

  // Use stable filter options (populated on first load, not affected by filters)
  const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear().toString()];
  const technicians = availableTechnicians;

  // Extract contracts from data
  const contracts = useMemo(() => {
    return contractsWithMaintenances.map(c => ({
      id: c.contract_id,
      label: `${c.contract_number} - ${c.client_name}`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [contractsWithMaintenances]);

  // Filter backlogs
  const filteredBacklogs = useMemo(() => {
    return backlogs.filter(b => {
      const matchesSearch =
        b.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.technician && b.technician.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTechnician = selectedTechnician === 'ALL' || b.technician === selectedTechnician;
      const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;

      return matchesSearch && matchesTechnician && matchesStatus;
    });
  }, [backlogs, searchTerm, selectedTechnician, selectedStatus]);

  // Calculate progress by maintenance type for DetailedStatusCard
  const detailedStatusCounts = useMemo(() => {
    const typeMap = new Map<string, {
      late: number;
      onSchedule: number;
      inProgress: number;
      planned: number;
      pending: number;
    }>();

    filteredBacklogs.forEach(b => {
      const current = typeMap.get(b.type) || { late: 0, onSchedule: 0, inProgress: 0, planned: 0, pending: 0 };

      if (b.status === 'EM ATRASO') current.late++;
      else if (b.status === 'EM DIA') current.onSchedule++;
      else if (b.status === 'EM ANDAMENTO') current.inProgress++;
      else if (b.status === 'PROGRAMADO') current.planned++;
      else if (b.status === 'PENDENTE') current.pending++;

      typeMap.set(b.type, current);
    });

    return Array.from(typeMap.entries()).map(([name, counts]) => ({
      title: name,
      description: '',
      ...counts
    }));
  }, [filteredBacklogs]);

  // Critical backlogs (for card display)
  const criticalBacklogs = useMemo(() => {
    return filteredBacklogs.filter(b => b.daysOpen > 30 || b.isRescheduled);
  }, [filteredBacklogs]);

  // Update recommendation handler
  const handleUpdateRecommendation = useCallback(async (taskId: string, recommendation: string) => {
    try {
      if (!session?.access_token) return;

      const response = await fetch(getApiUrl(`/api/reports/backlogs-recorrentes/${taskId}/recommendation`), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation })
      });

      if (response.ok) {
        setBacklogs(prev => prev.map(b => b.id === taskId ? { ...b, recommendation } : b));
        toast({ title: 'Recomendação salva', description: 'Recomendação atualizada com sucesso.' });
      }
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  }, [session]);

  // Export XLSX
  const exportToXLSX = useCallback(() => {
    if (backlogs.length === 0) {
      toast({ title: 'Nenhum dado', description: 'Não há dados para exportar.', variant: 'destructive' });
      return;
    }

    const rows = backlogs.map(b => ({
      'CONTRATO': b.code,
      'CLIENTE': b.client,
      'TIPO MANUTENÇÃO': b.type,
      'DATA AGENDADA': formatBacklogDate(b.scheduledDate),
      'DIAS ABERTO': b.daysOpen,
      'STATUS': b.status,
      'REPROGRAMAÇÕES': b.rescheduleCount,
      'PROGRESSO %': b.progress,
      'TÉCNICO': b.technician || '',
      'RECOMENDAÇÃO': b.recommendation || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Backlogs');

    const filename = `backlogs_recorrentes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({ title: 'Exportação concluída', description: `${backlogs.length} registros exportados.` });
  }, [backlogs]);

  // Status filter options
  const statusOptions = [
    { value: 'ALL', label: 'Todos', icon: <ListChecks className="mr-2 h-4 w-4" />, activeColor: 'bg-gray-800 text-white', inactiveColor: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 'EM ATRASO', label: 'Atrasados', icon: <AlertTriangle className="mr-2 h-4 w-4" />, activeColor: 'bg-red-500 text-white', inactiveColor: 'bg-red-50 text-red-600 hover:bg-red-100' },
    { value: 'EM DIA', label: 'Em Dia', icon: <CheckCircle className="mr-2 h-4 w-4" />, activeColor: 'bg-green-500 text-white', inactiveColor: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { value: 'EM ANDAMENTO', label: 'Em Andamento', icon: <Play className="mr-2 h-4 w-4" />, activeColor: 'bg-yellow-500 text-white', inactiveColor: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
    { value: 'PROGRAMADO', label: 'Programados', icon: <Calendar className="mr-2 h-4 w-4" />, activeColor: 'bg-blue-500 text-white', inactiveColor: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { value: 'PENDENTE', label: 'Pendentes', icon: <Hourglass className="mr-2 h-4 w-4" />, activeColor: 'bg-gray-500 text-white', inactiveColor: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header - Title + Export */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Backlogs Recorrentes</h1>
        <button
          onClick={exportToXLSX}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          title="Exportar dados filtrados para Excel (XLSX)"
        >
          <Download className="h-5 w-5" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Filter className="h-5 w-5" />
            <span>Filtros:</span>
          </div>

          {/* Year Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto text-sm pl-3 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="ALL">Todos os Anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Month Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto text-sm pl-3 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="ALL">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Technician Filter */}
          <div className="relative w-full sm:w-auto">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full sm:w-auto text-sm pl-10 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              aria-label="Filtrar por técnico"
            >
              <option value="ALL">Todos os Técnicos</option>
              {technicians.map(tech => <option key={tech} value={tech}>{tech}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Contract Filter */}
          <div className="relative w-full sm:w-auto">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full sm:w-auto text-sm pl-10 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none max-w-[250px]"
              aria-label="Filtrar por contrato"
            >
              <option value="ALL">Todos os Contratos</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Apply Filter Button */}
          <button
            onClick={() => fetchBacklogs()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPI title="Total de Tarefas" value={kpis.totalBacklogs} icon={<ListChecks className="h-8 w-8 text-gray-500" />} />
        <KPI title="Críticos (>30 Dias)" value={kpis.criticalBacklogs} icon={<AlertTriangle className="h-8 w-8 text-red-500" />} />
        <KPI title="Em Dia" value={kpis.onSchedule} icon={<CheckCircle className="h-8 w-8 text-green-500" />} />
        <KPI title="Reprogramados" value={kpis.rescheduled} icon={<RefreshCw className="h-8 w-8 text-blue-500" />} />
        <KPI title="Média Dias Aberto" value={Math.round(kpis.avgDaysOpen)} icon={<Hourglass className="h-8 w-8 text-yellow-500" />} />
      </div>

      {/* Progress by Maintenance Type - Horizontal Bars */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Progresso por Tipo de Manutenção</h2>
            <p className="text-sm text-gray-500">Avanço Físico: Executado (%) vs Planejado (100%)</p>
          </div>
          <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded text-gray-600">
            {progressByType.length} Categorias
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          {progressByType.length > 0 ? progressByType.map((item, index) => {
            const percent = item.progress_percent;
            let progressColor = 'bg-blue-600';
            if (percent === 100) progressColor = 'bg-emerald-500';
            else if (percent < 40) progressColor = 'bg-red-500';
            else if (percent < 80) progressColor = 'bg-amber-500';

            return (
              <div key={index} className="flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-gray-700 truncate mr-2" title={item.type_name}>
                    {item.type_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative h-3 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${progressColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${
                    percent === 100 ? 'text-emerald-600' :
                    percent < 40 ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {Math.round(percent)}%
                  </span>
                </div>
              </div>
            );
          }) : <p className="col-span-full text-center text-gray-500">Sem dados para o período selecionado.</p>}
        </div>
      </div>

      {/* S-Curve Chart */}
      {curvaSData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-center uppercase">Curva S - Avanço Físico Acumulado</h2>
          <CurvaSChart data={curvaSData} />
        </div>
      )}

      {/* Maintenances by Contract */}
      {contractsWithMaintenances.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Todas as Tarefas de Manutenção</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente, ID..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contractsWithMaintenances.map((contract, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Contract Header */}
                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-800 uppercase text-xs leading-tight pr-2">{contract.client_name}</h3>
                    {contract.maintenances.some(m => m.status === 'overdue') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-red-50 text-red-700 whitespace-nowrap border border-red-100">
                        Atenção
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-2">{contract.contract_number}</p>

                  <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                    {contract.region && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="truncate">{contract.region}</span>
                      </div>
                    )}
                    {contract.power_kva && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        {contract.power_kva} KVA
                      </div>
                    )}
                    {contract.technician_name && (
                      <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                        <User className="h-3 w-3 text-gray-400" />
                        {contract.technician_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Maintenances List */}
                <div className="p-3 bg-white">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status & Datas</h4>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {contract.maintenances.map((maintenance, mIdx) => {
                      const scheduledDate = maintenance.scheduled_date ? formatBacklogDate(maintenance.scheduled_date) : '-';
                      const completedDate = maintenance.completed_date ? formatBacklogDate(maintenance.completed_date) : '-';
                      const status = mapBacklogDbStatusToAppStatus(maintenance.status, maintenance.scheduled_date);

                      return (
                        <div key={mIdx} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-gray-50 last:border-0">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-medium text-gray-700 truncate text-xs">{maintenance.type}</span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono tracking-tight mt-0.5">
                              <span>{scheduledDate}</span>
                              <span className="text-gray-300">→</span>
                              <span>{completedDate}</span>
                            </div>
                          </div>

                          <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${
                            status === 'EM DIA' ? 'bg-green-50 text-green-700 border-green-100' :
                            status === 'EM ATRASO' ? 'bg-red-50 text-red-700 border-red-100' :
                            status === 'PROGRAMADO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-gray-50 text-gray-700 border-gray-100'
                          }`}>
                            {status === 'EM DIA' ? 'DIA' : status === 'EM ATRASO' ? 'ATRASO' : status === 'PROGRAMADO' ? 'PROG' : 'PEND'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visão Detalhada de Backlog e Recomendações - Table View */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Visão Detalhada de Backlog e Recomendações</h2>
              <p className="text-sm text-gray-500 mt-1">
                <AlertTriangle className="inline h-4 w-4 text-red-500 mr-1" />
                Backlogs Críticos (&gt;30 Dias & Reprogramados)
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Filtro automático aplicado: OS com desvios de cronograma ou sem execução</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-50 text-red-600 text-sm font-semibold rounded-full border border-red-100">
                {criticalBacklogs.length} Itens Críticos
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de Manutenção</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Técnico</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Dias Aberto</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Progresso</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {criticalBacklogs.length > 0 ? (
                criticalBacklogs.map((task, idx) => (
                  <tr key={task.id} className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    {/* Contrato */}
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-gray-700">{task.code}</span>
                    </td>

                    {/* Tipo de Manutenção */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{task.type}</p>
                        {task.typeCode && task.typeCode !== task.type && (
                          <p className="text-xs text-gray-400">{task.typeCode}</p>
                        )}
                      </div>
                    </td>

                    {/* Cliente / Técnico */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{task.client}</p>
                        {task.technician && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" />
                            {task.technician}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Dias Aberto */}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-semibold text-sm ${
                        task.daysOpen > 30 ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        <Hourglass className="h-4 w-4" />
                        {task.daysOpen} dias
                      </span>
                    </td>

                    {/* Progresso */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.progress >= 100 ? 'bg-green-500' :
                              task.progress >= 50 ? 'bg-blue-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(task.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10">{task.progress}%</span>
                      </div>
                    </td>

                    {/* Status & Alertas */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          task.status === 'EM ATRASO' ? 'bg-red-100 text-red-700' :
                          task.status === 'EM DIA' ? 'bg-green-100 text-green-700' :
                          task.status === 'EM ANDAMENTO' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status === 'EM ATRASO' ? 'Atrasado' :
                           task.status === 'EM DIA' ? 'Em Dia' :
                           task.status === 'EM ANDAMENTO' ? 'Andamento' : task.status}
                        </span>
                        {task.rescheduleCount > 0 && (
                          <span className="text-xs text-orange-600 flex items-center gap-0.5">
                            <RefreshCw className="h-3 w-3" />
                            Reprogramado {task.rescheduleCount}x
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhum backlog crítico encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BacklogReports;
