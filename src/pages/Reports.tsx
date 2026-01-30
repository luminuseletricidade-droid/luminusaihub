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
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/utils/toastManager';
import * as XLSX from 'xlsx';

// Components
import KPI from '@/components/dashboard/KPI';
import DetailedStatusCard from '@/components/dashboard/DetailedStatusCard';
import MaintenanceTaskCard from '@/components/dashboard/MaintenanceTaskCard';
import MonthlyTasksEvolutionChart from '@/components/dashboard/charts/MonthlyTasksEvolutionChart';
import StatusDistributionChart from '@/components/dashboard/charts/StatusDistributionChart';
import TasksByRegionChart from '@/components/dashboard/charts/TasksByRegionChart';
import TasksByTechnicianChart from '@/components/dashboard/charts/TasksByTechnicianChart';

// Types & Utils
import type { MaintenanceTask, MaintenanceItem, Status } from '@/components/dashboard/types';
import { getOverallStatus, getTaskStatuses } from '@/components/dashboard/utils/statusHelper';

interface Region {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

const Reports = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Status | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [regions, setRegions] = useState<Region[]>([]);

  // Função de mapeamento de status - alinhada com página Maintenances
  // Banco: scheduled, in_progress, completed, overdue, cancelled, pending
  const mapDbStatusToAppStatus = useCallback((dbStatus: string | null, scheduledDate: string | null): Status => {
    if (!dbStatus) return 'PENDENTE';

    const normalizedStatus = dbStatus.toLowerCase().trim();

    // Helper para verificar se data já passou (usa 09:00 como horário padrão)
    const isDatePast = (date: string | null): boolean => {
      if (!date) return false;
      const dateOnly = date.split('T')[0];
      const scheduledDateTime = new Date(dateOnly + 'T09:00:00');
      return scheduledDateTime < new Date();
    };

    // OVERDUE - Atrasada
    if (normalizedStatus === 'overdue' || normalizedStatus === 'atrasada' || normalizedStatus === 'atrasado') {
      return 'EM ATRASO';
    }

    // COMPLETED - Concluída/Em Dia
    if (normalizedStatus === 'completed' || normalizedStatus === 'concluída' || normalizedStatus === 'concluida' ||
        normalizedStatus === 'concluído' || normalizedStatus === 'concluido') {
      return 'EM DIA';
    }

    // IN_PROGRESS - Em Andamento
    if (normalizedStatus === 'in_progress' || normalizedStatus === 'in-progress' ||
        normalizedStatus === 'em andamento' || normalizedStatus === 'em_andamento') {
      return 'EM ANDAMENTO';
    }

    // SCHEDULED - Pendente (se data futura) ou Atrasada (se data passou)
    // Na página Maintenances, "scheduled" é exibido como "Pendente"
    if (normalizedStatus === 'scheduled' || normalizedStatus === 'agendada' || normalizedStatus === 'agendado') {
      if (isDatePast(scheduledDate)) {
        return 'EM ATRASO';
      }
      return 'PENDENTE';
    }

    // PENDING - Pendente
    if (normalizedStatus === 'pending' || normalizedStatus === 'pendente') {
      if (isDatePast(scheduledDate)) {
        return 'EM ATRASO';
      }
      return 'PENDENTE';
    }

    // CANCELLED - Cancelada (tratamos como Programado para não sumir)
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'cancelada' || normalizedStatus === 'cancelado') {
      return 'PROGRAMADO';
    }

    // Fallback - verifica pela data
    if (isDatePast(scheduledDate)) {
      return 'EM ATRASO';
    }
    return 'PENDENTE';
  }, []);

  // Função de fetch extraída para reutilização
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      if (!user) {
        console.log('⚠️ Reports: No user found');
        return;
      }

      console.log('👤 Reports: Fetching data for user:', user.id);

      // Fetch contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id);

      if (contractsError) throw contractsError;

      // Fetch maintenances
      const { data: maintenances, error: maintenancesError } = await supabase
        .from('maintenances')
        .select('*');

      if (maintenancesError) throw maintenancesError;
      console.log('🔧 Reports: Maintenances fetched:', maintenances?.length || 0);

      // Transform data into MaintenanceTask format
      const tasksMap = new Map<string, MaintenanceTask>();
      const contractsMap = new Map<string, any>();
      contracts?.forEach(contract => {
        contractsMap.set(contract.id, contract);
      });

      // Group maintenances by contract_id
      maintenances?.forEach(m => {
        if (!m.contract_id) return;

        const contract = contractsMap.get(m.contract_id);
        if (!contract) return;

        const status = mapDbStatusToAppStatus(m.status, m.scheduled_date);
        const date = m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('pt-BR') : null;

        const maintenanceItem: MaintenanceItem = {
          id: m.id,
          type: m.type || 'Manutenção',
          date: date,
          status: status,
          technician: m.technician || null
        };

        if (tasksMap.has(m.contract_id)) {
          const existingTask = tasksMap.get(m.contract_id)!;
          existingTask.maintenances.push(maintenanceItem);
          if (!existingTask.technician && m.technician) {
            existingTask.technician = m.technician;
          }
          // Atualiza região se a task ainda não tem e a manutenção tem
          if (existingTask.region === 'Sem Região' && m.region_id) {
            const regionData = regions.find(r => r.id === m.region_id);
            if (regionData) {
              existingTask.region = regionData.name;
            }
          }
        } else {
          // Determine region from maintenance's region_id
          let taskRegion = 'Sem Região';
          if (m.region_id) {
            const regionData = regions.find(r => r.id === m.region_id);
            if (regionData) {
              taskRegion = regionData.name;
            }
          }

          const task: MaintenanceTask = {
            id: m.contract_id,
            client: contract.client_name || 'Cliente Desconhecido',
            code: `GMG ${contract.equipment_power || '---'} / ${contract.contract_number || 'S/N'}`,
            powerKVA: contract.equipment_power ? parseFloat(contract.equipment_power) : null,
            region: taskRegion,
            technician: m.technician || null,
            maintenances: [maintenanceItem],
            backlog: null,
            observations: contract.technical_notes,
            maintenanceType: null,
            maintenanceStatus: null,
            maintenanceDate: null,
            monthlyMaintenanceDate: null,
            monthlyMaintenanceStatus: null,
            '250hMaintenanceDate': null,
            '250hMaintenanceStatus': null,
            tankCleaningDate: null,
            tankCleaningStatus: null,
            alternatorMeggerDate: null,
            alternatorMeggerStatus: null,
            radiatorMeggerDate: null,
            radiatorMeggerStatus: null,
            radiatorCleaningDate: null,
            radiatorCleaningStatus: null,
            valveRegulationDate: null,
            valveRegulationStatus: null,
            '500hMaintenanceDate': null,
            '500hMaintenanceStatus': null,
            batteryDate: null,
            batteryStatus: null,
          };
          tasksMap.set(m.contract_id, task);
        }
      });

      const newTasks = Array.from(tasksMap.values());
      console.log('✅ Reports: Tasks updated:', newTasks.length);
      setTasks(newTasks);

    } catch (error) {
      console.error('❌ Reports: Error fetching dashboard data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive'
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, mapDbStatusToAppStatus, regions]);

  // Função para carregar regiões
  const loadRegions = useCallback(async () => {
    try {
      const data = await apiFetch<Region[]>("/api/regions");
      setRegions((data || []).filter(r => r.is_active));
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  }, []);

  // Carrega regiões primeiro
  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  // Fetch inicial + Realtime subscription (só após regions carregarem)
  useEffect(() => {
    // Só busca dados se tiver user (regions pode estar vazio inicialmente)
    if (!user) return;
    fetchData();

    // Realtime subscription para maintenances
    const channel = supabase
      .channel('reports-maintenances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenances',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        (payload) => {
          console.log('🔄 Reports: Realtime update received:', payload.eventType);
          // Refetch sem mostrar loading para updates em tempo real
          fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // Helper function to parse date from "DD/MM/YYYY" format
  const parseDateString = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    // Handle both DD/MM/YYYY and ISO formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    // Try ISO format
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Helper to get all dates from a task (using maintenances array)
  const getTaskDates = (task: MaintenanceTask): Date[] => {
    // Usa o array maintenances para extrair datas
    if (task.maintenances && task.maintenances.length > 0) {
      return task.maintenances
        .map(m => parseDateString(m.date))
        .filter((d): d is Date => d !== null);
    }

    // Fallback para campo maintenanceDate
    if (task.maintenanceDate) {
      const parsed = parseDateString(task.maintenanceDate);
      if (parsed) return [parsed];
    }

    // Fallback para campos legados
    const dateFields = [
      task.monthlyMaintenanceDate,
      task['250hMaintenanceDate'],
      task.tankCleaningDate,
      task.alternatorMeggerDate,
      task.radiatorMeggerDate,
      task.radiatorCleaningDate,
      task.valveRegulationDate,
      task['500hMaintenanceDate'],
      task.batteryDate,
    ];

    return dateFields
      .map(d => parseDateString(d))
      .filter((d): d is Date => d !== null);
  };

  // Derived state for filters - Extract years dynamically from tasks
  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    tasks.forEach(task => {
      const dates = getTaskDates(task);
      dates.forEach(date => {
        uniqueYears.add(date.getFullYear().toString());
      });
    });
    // Sort descending and ensure current year is included
    const currentYear = new Date().getFullYear().toString();
    uniqueYears.add(currentYear);
    return Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a));
  }, [tasks]);

  const technicians = useMemo(() => {
    const techs = new Set<string>();
    tasks.forEach(t => {
      // Adiciona técnico do nível do contrato
      if (t.technician) techs.add(t.technician);
      // Adiciona técnicos de cada manutenção individual
      t.maintenances?.forEach(m => {
        if (m.technician) techs.add(m.technician);
      });
    });
    return Array.from(techs).sort();
  }, [tasks]);

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    console.log('🔍 Filtering tasks with:', { selectedYear, selectedMonth, selectedTechnician, selectedStatus, selectedRegion, searchTerm });

    // Verifica se o contrato tem ALGUMA manutenção com o status selecionado
    const hasMaintenanceWithStatus = (task: MaintenanceTask, status: Status): boolean => {
      if (!task.maintenances || task.maintenances.length === 0) return false;
      return task.maintenances.some(m => m.status === status);
    };

    return tasks.filter(task => {
      const matchesSearch =
        task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.technician && task.technician.toLowerCase().includes(searchTerm.toLowerCase()));

      // Technician filter - verifica tanto no contrato quanto nas manutenções individuais
      let matchesTechnician = selectedTechnician === 'ALL';
      if (!matchesTechnician) {
        // Verifica no nível do contrato
        if (task.technician === selectedTechnician) {
          matchesTechnician = true;
        } else {
          // Verifica em cada manutenção individual
          matchesTechnician = task.maintenances?.some(m => m.technician === selectedTechnician) || false;
        }
      }

      // Region filter - filtra pelo nome da região
      let matchesRegion = selectedRegion === 'ALL';
      if (!matchesRegion) {
        // Busca o nome da região selecionada
        const selectedRegionData = regions.find(r => r.id === selectedRegion);
        if (selectedRegionData) {
          // Compara com task.region (que pode ser o estado ou nome da região)
          matchesRegion = task.region?.toLowerCase() === selectedRegionData.name.toLowerCase();
        }
      }

      // Status filter - mostra o card se tiver QUALQUER manutenção com o status selecionado
      const matchesStatus = selectedStatus === 'ALL' || hasMaintenanceWithStatus(task, selectedStatus);

      // Date filter (Year/Month)
      // Check if ANY of the task's maintenance dates fall in the selected period
      let matchesDate = true;
      if (selectedYear !== 'ALL' || selectedMonth !== 'ALL') {
        const taskDates = getTaskDates(task);

        if (taskDates.length === 0) {
          // No dates in this task, don't match if filtering by date
          matchesDate = false;
        } else {
          matchesDate = taskDates.some(date => {
            const yearMatches = selectedYear === 'ALL' || date.getFullYear().toString() === selectedYear;
            const monthMatches = selectedMonth === 'ALL' || date.getMonth().toString() === selectedMonth;
            return yearMatches && monthMatches;
          });
        }
      }

      return matchesSearch && matchesTechnician && matchesRegion && matchesStatus && matchesDate;
    });
  }, [tasks, searchTerm, selectedTechnician, selectedStatus, selectedYear, selectedMonth, selectedRegion, regions]);

  // Log filtered results
  useEffect(() => {
    console.log('✅ Filtered tasks result:', filteredTasks.length, 'of', tasks.length);
  }, [filteredTasks, tasks]);

  // XLSX Export Function
  const exportToXLSX = () => {
    if (filteredTasks.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Aplique filtros que retornem dados antes de exportar.',
        variant: 'destructive'
      });
      return;
    }

    // Headers matching the requested columns
    const headers = [
      'IDENTIFICAÇÃO',
      'CLIENTE',
      'CÓDIGO',
      'POTÊNCIA KVA',
      'REGIÃO',
      'STATUS MANUTENÇÃO MENSAL',
      'DATA MANUTENÇÃO MENSAL',
      'STATUS MANUTENÇÃO 250H',
      'DATA MANUTENÇÃO 250H',
      'STATUS MANUTENÇÃO 500H',
      'DATA MANUTENÇÃO 500H',
      'STATUS LIMPEZA DE TANQUE',
      'DATA LIMPEZA TANQUE',
      'STATUS MEGAGEM ALTERNADOR',
      'DATA MEGAGEM ALTERNADOR',
      'STATUS MEGAGEM RADIADOR',
      'DATA MEGAGEM RADIADOR',
      'STATUS LIMPEZA RADIADOR',
      'DATA LIMPEZA RADIADOR',
      'STATUS REGULAGEM VÁLVULAS',
      'DATA REGULAGEM VÁLVULAS',
      'STATUS BATERIA',
      'DATA BATERIA',
      'TÉCNICO',
      'OBSERVAÇÕES'
    ];

    // Helper para obter descrições dos tipos de manutenção ativos na task
    const getMaintenanceTypeDescriptions = (task: MaintenanceTask): string => {
      const descriptions: string[] = [];

      if (task.monthlyMaintenanceStatus) {
        descriptions.push('Manutenção Mensal: Limpeza, verificações, teste operacional');
      }
      if (task['250hMaintenanceStatus']) {
        descriptions.push('Manutenção Preventiva 250h: A cada 6 meses ou 250h - troca de óleo e filtros');
      }
      if (task['500hMaintenanceStatus']) {
        descriptions.push('Manutenção Preventiva 500h: A cada 12 meses ou 500h - troca completa de filtros');
      }
      if (task.tankCleaningStatus) {
        descriptions.push('Limpeza de Tanque: A cada 6 meses');
      }
      if (task.alternatorMeggerStatus) {
        descriptions.push('Inspeção de Alternador: A cada 6 meses');
      }
      if (task.radiatorMeggerStatus) {
        descriptions.push('Megagem Radiador: Verificação de isolamento');
      }
      if (task.radiatorCleaningStatus) {
        descriptions.push('Limpeza de Radiador: A cada 6 meses');
      }
      if (task.valveRegulationStatus) {
        descriptions.push('Regulagem de Válvulas: A cada 6 meses');
      }
      if (task.batteryStatus) {
        descriptions.push('Troca de Bateria: Substituição de bateria do sistema');
      }

      // Combina observações originais com descrições dos tipos
      const baseObs = task.observations || '';
      const typeDescs = descriptions.join(' | ');

      if (baseObs && typeDescs) {
        return `${baseObs} | ${typeDescs}`;
      }
      return typeDescs || baseObs;
    };

    // Map tasks to rows
    const rows = filteredTasks.map(task => ({
      'IDENTIFICAÇÃO': task.id || '',
      'CLIENTE': task.client || '',
      'CÓDIGO': task.code || '',
      'POTÊNCIA KVA': task.powerKVA || '',
      'REGIÃO': task.region || '',
      'STATUS MANUTENÇÃO MENSAL': task.monthlyMaintenanceStatus || '',
      'DATA MANUTENÇÃO MENSAL': task.monthlyMaintenanceDate || '',
      'STATUS MANUTENÇÃO 250H': task['250hMaintenanceStatus'] || '',
      'DATA MANUTENÇÃO 250H': task['250hMaintenanceDate'] || '',
      'STATUS MANUTENÇÃO 500H': task['500hMaintenanceStatus'] || '',
      'DATA MANUTENÇÃO 500H': task['500hMaintenanceDate'] || '',
      'STATUS LIMPEZA DE TANQUE': task.tankCleaningStatus || '',
      'DATA LIMPEZA TANQUE': task.tankCleaningDate || '',
      'STATUS MEGAGEM ALTERNADOR': task.alternatorMeggerStatus || '',
      'DATA MEGAGEM ALTERNADOR': task.alternatorMeggerDate || '',
      'STATUS MEGAGEM RADIADOR': task.radiatorMeggerStatus || '',
      'DATA MEGAGEM RADIADOR': task.radiatorMeggerDate || '',
      'STATUS LIMPEZA RADIADOR': task.radiatorCleaningStatus || '',
      'DATA LIMPEZA RADIADOR': task.radiatorCleaningDate || '',
      'STATUS REGULAGEM VÁLVULAS': task.valveRegulationStatus || '',
      'DATA REGULAGEM VÁLVULAS': task.valveRegulationDate || '',
      'STATUS BATERIA': task.batteryStatus || '',
      'DATA BATERIA': task.batteryDate || '',
      'TÉCNICO': task.technician || '',
      'OBSERVAÇÕES': getMaintenanceTypeDescriptions(task)
    }));

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Set column widths
    const colWidths = [
      { wch: 36 },  // IDENTIFICAÇÃO
      { wch: 30 },  // CLIENTE
      { wch: 15 },  // CÓDIGO
      { wch: 12 },  // POTÊNCIA KVA
      { wch: 15 },  // REGIÃO
      { wch: 20 },  // STATUS MANUTENÇÃO MENSAL
      { wch: 18 },  // DATA MANUTENÇÃO MENSAL
      { wch: 18 },  // STATUS MANUTENÇÃO 250H
      { wch: 16 },  // DATA MANUTENÇÃO 250H
      { wch: 18 },  // STATUS MANUTENÇÃO 500H
      { wch: 16 },  // DATA MANUTENÇÃO 500H
      { wch: 20 },  // STATUS LIMPEZA DE TANQUE
      { wch: 16 },  // DATA LIMPEZA TANQUE
      { wch: 22 },  // STATUS MEGAGEM ALTERNADOR
      { wch: 18 },  // DATA MEGAGEM ALTERNADOR
      { wch: 20 },  // STATUS MEGAGEM RADIADOR
      { wch: 16 },  // DATA MEGAGEM RADIADOR
      { wch: 18 },  // STATUS LIMPEZA RADIADOR
      { wch: 16 },  // DATA LIMPEZA RADIADOR
      { wch: 22 },  // STATUS REGULAGEM VÁLVULAS
      { wch: 18 },  // DATA REGULAGEM VÁLVULAS
      { wch: 15 },  // STATUS BATERIA
      { wch: 12 },  // DATA BATERIA
      { wch: 20 },  // TÉCNICO
      { wch: 50 },  // OBSERVAÇÕES
    ];
    worksheet['!cols'] = colWidths;

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Manutenção');

    // Generate filename with current date and filter info
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const yearInfo = selectedYear !== 'ALL' ? `_${selectedYear}` : '';
    const monthInfo = selectedMonth !== 'ALL' ? `_${new Date(0, parseInt(selectedMonth)).toLocaleString('pt-BR', { month: 'short' })}` : '';
    const filename = `relatorio_manutencao${yearInfo}${monthInfo}_${dateStr}.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, filename);

    toast({
      title: 'Exportação concluída',
      description: `${filteredTasks.length} registros exportados para ${filename}`,
    });

    console.log('📥 XLSX exported:', filename, 'with', filteredTasks.length, 'records');
  };

  // Função local para calcular status geral a partir do array maintenances
  const getTaskOverallStatus = (task: MaintenanceTask): Status => {
    if (!task.maintenances || task.maintenances.length === 0) {
      // Fallback para função legada
      return getOverallStatus(task);
    }

    const statuses = task.maintenances.map(m => m.status).filter(s => s !== null);

    if (statuses.some(s => s === 'EM ATRASO')) return 'EM ATRASO';
    if (statuses.some(s => s === 'PROGRAMADO')) return 'PROGRAMADO';
    if (statuses.some(s => s === 'PENDENTE')) return 'PENDENTE';
    if (statuses.some(s => s === 'EM DIA')) return 'EM DIA';

    return null;
  };

  // KPIs Calculation - conta manutenções individuais que passam nos filtros de data
  const kpis = useMemo(() => {
    let total = 0;
    let late = 0;
    let onSchedule = 0;
    let inProgress = 0;
    let planned = 0;
    let pending = 0;

    // Função para verificar se a data da manutenção está no período filtrado
    const maintenanceMatchesDateFilter = (maintenanceDate: string | null): boolean => {
      // Se não há filtro de data, todas passam
      if (selectedYear === 'ALL' && selectedMonth === 'ALL') return true;

      // Se não tem data, não passa no filtro de data
      if (!maintenanceDate) return false;

      const parsed = parseDateString(maintenanceDate);
      if (!parsed) return false;

      const yearMatches = selectedYear === 'ALL' || parsed.getFullYear().toString() === selectedYear;
      const monthMatches = selectedMonth === 'ALL' || parsed.getMonth().toString() === selectedMonth;

      return yearMatches && monthMatches;
    };

    // Itera sobre cada contrato e conta apenas manutenções que passam no filtro de data
    filteredTasks.forEach(task => {
      if (task.maintenances && task.maintenances.length > 0) {
        task.maintenances.forEach(maintenance => {
          // Só conta se a manutenção passar no filtro de data
          if (!maintenanceMatchesDateFilter(maintenance.date)) return;

          total++;
          const status = maintenance.status;
          if (status === 'EM ATRASO') late++;
          else if (status === 'EM DIA') onSchedule++;
          else if (status === 'EM ANDAMENTO') inProgress++;
          else if (status === 'PROGRAMADO') planned++;
          else if (status === 'PENDENTE') pending++;
        });
      }
    });

    console.log('📊 Reports: KPIs calculated:', { total, late, onSchedule, inProgress, planned, pending });
    return { total, late, onSchedule, inProgress, planned, pending };
  }, [filteredTasks, selectedYear, selectedMonth]);

  // Mapa de tipos de manutenção com descrições detalhadas
  const maintenanceTypeDescriptions: Record<string, { title: string; description: string }> = {
    'preventiva250h': {
      title: 'Manutenção Preventiva 250h',
      description: 'A cada 6 meses ou 250h - troca de óleo e filtros'
    },
    'preventiva500h': {
      title: 'Manutenção Preventiva 500h',
      description: 'A cada 12 meses ou 500h - troca completa de filtros'
    },
    'mensal': {
      title: 'Manutenção Mensal',
      description: 'Limpeza, verificações, teste operacional'
    },
    'corretiva': {
      title: 'Manutenção Corretiva',
      description: 'Sob demanda'
    },
    'emergencial': {
      title: 'Atendimento Emergencial',
      description: '24/7, SLA urgência'
    },
    'testeCarga': {
      title: 'Teste de Carga / Operação Assistida de Partida',
      description: 'Teste de carga e operação assistida de partida'
    },
    'startup': {
      title: 'Startup / Comissionamento',
      description: 'Sob demanda'
    },
    'avariasControlador': {
      title: 'Avarias de Controlador',
      description: 'Reparo e substituição de controladores'
    },
    'visitaOrcamentaria': {
      title: 'Visita Técnica Orçamentária',
      description: 'Sob demanda'
    },
    'visitaInspecao': {
      title: 'Visita Técnica de Inspeção',
      description: 'Inspeção técnica do equipamento'
    },
    'inspecaoAlternador': {
      title: 'Inspeção de Alternador',
      description: 'A cada 6 meses'
    },
    'limpezaRadiador': {
      title: 'Limpeza de Radiador',
      description: 'A cada 6 meses'
    },
    'instalacaoEquipamentos': {
      title: 'Instalação de Equipamentos',
      description: 'Instalação de equipamentos auxiliares'
    },
    'instalacaoGMG': {
      title: 'Instalação de GMG – Próprio (permanente)',
      description: 'Instalação permanente de grupo motor-gerador'
    },
    'limpezaTanque': {
      title: 'Limpeza de Tanque',
      description: 'A cada 6 meses'
    },
    'trocaBateria': {
      title: 'Troca de Bateria',
      description: 'Substituição de bateria do sistema'
    },
    'mensalComplementar': {
      title: 'Manutenção Mensal (complementar)',
      description: 'Serviços complementares à manutenção mensal'
    },
    'regulagemValvulas': {
      title: 'Regulagem de Válvulas',
      description: 'A cada 6 meses'
    },
    'revisaoBombaInjetora': {
      title: 'Revisão/Calibração de Bomba Injetora',
      description: 'Revisão e calibração da bomba injetora'
    },
    'entregaRetiradaGMG': {
      title: 'Entrega/Retirada de GMG',
      description: 'Logística de entrega e retirada de grupo motor-gerador'
    }
  };

  // Detailed Status Counts - Visão Geral por Tipo de Manutenção
  // Mostra todos os 20 tipos de manutenção e conta do array maintenances
  const detailedStatusCounts = useMemo(() => {
    // 20 tipos de manutenção - nomes exatos como salvos no banco
    const maintenanceTypes = [
      'Manutenção Preventiva 250h',
      'Manutenção Preventiva 500h',
      'Manutenção Mensal',
      'Manutenção Corretiva',
      'Atendimento Emergencial',
      'Teste de Carga / Operação Assistida de Partida',
      'Startup / Comissionamento',
      'Avarias de Controlador',
      'Visita Técnica Orçamentária',
      'Visita Técnica de Inspeção',
      'Inspeção de Alternador',
      'Limpeza de Radiador',
      'Instalação de Equipamentos',
      'Instalação de GMG – Próprio (permanente)',
      'Limpeza de Tanque',
      'Troca de Bateria',
      'Manutenção Mensal (complementar)',
      'Regulagem de Válvulas',
      'Revisão/Calibração de Bomba Injetora',
      'Entrega/Retirada de GMG'
    ];

    // Mapa de descrições detalhadas para cada tipo
    const typeDescriptions: Record<string, string> = {
      'Manutenção Preventiva 250h': 'A cada 6 meses ou 250h - troca de óleo e filtros',
      'Manutenção Preventiva 500h': 'A cada 12 meses ou 500h - troca completa de filtros',
      'Manutenção Mensal': 'Limpeza, verificações, teste operacional',
      'Manutenção Corretiva': 'Sob demanda',
      'Atendimento Emergencial': '24/7, SLA urgência',
      'Teste de Carga / Operação Assistida de Partida': 'Teste de carga e operação assistida de partida',
      'Startup / Comissionamento': 'Sob demanda',
      'Avarias de Controlador': 'Reparo e substituição de controladores',
      'Visita Técnica Orçamentária': 'Sob demanda',
      'Visita Técnica de Inspeção': 'Inspeção técnica do equipamento',
      'Inspeção de Alternador': 'A cada 6 meses',
      'Limpeza de Radiador': 'A cada 6 meses',
      'Instalação de Equipamentos': 'Instalação de equipamentos auxiliares',
      'Instalação de GMG – Próprio (permanente)': 'Instalação permanente de grupo motor-gerador',
      'Limpeza de Tanque': 'A cada 6 meses',
      'Troca de Bateria': 'Substituição de bateria do sistema',
      'Manutenção Mensal (complementar)': 'Serviços complementares à manutenção mensal',
      'Regulagem de Válvulas': 'A cada 6 meses',
      'Revisão/Calibração de Bomba Injetora': 'Revisão e calibração da bomba injetora',
      'Entrega/Retirada de GMG': 'Logística de entrega e retirada de grupo motor-gerador'
    };

    // Mapa de aliases para normalizar nomes de tipos do banco
    const typeAliases: Record<string, string> = {
      'Preventiva': 'Manutenção Preventiva 250h',
      'Preditiva': 'Manutenção Corretiva',
      'Trimestral': 'Manutenção Mensal',
      'Semestral': 'Manutenção Preventiva 500h'
    };

    // Função para verificar se a manutenção passa no filtro de data
    const maintenanceMatchesDateFilter = (maintenanceDate: string | null): boolean => {
      if (selectedYear === 'ALL' && selectedMonth === 'ALL') return true;
      if (!maintenanceDate) return false;

      const parsed = parseDateString(maintenanceDate);
      if (!parsed) return false;

      const yearMatches = selectedYear === 'ALL' || parsed.getFullYear().toString() === selectedYear;
      const monthMatches = selectedMonth === 'ALL' || parsed.getMonth().toString() === selectedMonth;

      return yearMatches && monthMatches;
    };

    return maintenanceTypes.map(typeName => {
      let late = 0, onSchedule = 0, inProgress = 0, planned = 0, pending = 0;

      // Conta manutenções do array maintenances de cada task
      filteredTasks.forEach(task => {
        task.maintenances?.forEach(maintenance => {
          // Aplica filtro de data
          if (!maintenanceMatchesDateFilter(maintenance.date)) return;

          // Normaliza o tipo usando aliases se necessário
          const maintenanceType = maintenance.type || '';
          const normalizedType = typeAliases[maintenanceType] || maintenanceType;

          // Verifica se corresponde a este tipo
          if (normalizedType === typeName || maintenanceType === typeName) {
            const status = maintenance.status;
            if (status === 'EM ATRASO') late++;
            else if (status === 'EM DIA') onSchedule++;
            else if (status === 'EM ANDAMENTO') inProgress++;
            else if (status === 'PROGRAMADO') planned++;
            else if (status === 'PENDENTE') pending++;
          }
        });
      });

      return {
        title: typeName,
        description: typeDescriptions[typeName] || '',
        late,
        onSchedule,
        inProgress,
        planned,
        pending
      };
    });
  }, [filteredTasks, selectedYear, selectedMonth]);

  const statusOptions = [
    { value: 'ALL', label: 'Todos', icon: <ListChecks className="mr-2 h-4 w-4" />, activeColor: 'bg-gray-800 text-white', inactiveColor: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 'EM ATRASO', label: 'Atrasados', icon: <AlertTriangle className="mr-2 h-4 w-4" />, activeColor: 'bg-red-500 text-white', inactiveColor: 'bg-red-50 text-red-600 hover:bg-red-100' },
    { value: 'EM DIA', label: 'Em Dia', icon: <CheckCircle className="mr-2 h-4 w-4" />, activeColor: 'bg-green-500 text-white', inactiveColor: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { value: 'EM ANDAMENTO', label: 'Em Andamento', icon: <Play className="mr-2 h-4 w-4" />, activeColor: 'bg-yellow-500 text-white', inactiveColor: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
    { value: 'PROGRAMADO', label: 'Programados', icon: <Calendar className="mr-2 h-4 w-4" />, activeColor: 'bg-blue-500 text-white', inactiveColor: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { value: 'PENDENTE', label: 'Pendentes', icon: <Hourglass className="mr-2 h-4 w-4" />, activeColor: 'bg-gray-500 text-white', inactiveColor: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
  ];

  const chartYear = selectedYear !== 'ALL' ? parseInt(selectedYear) : new Date().getFullYear();
  const chartMonth = selectedMonth !== 'ALL' ? parseInt(selectedMonth) : new Date().getMonth();
  const monthName = new Date(chartYear, chartMonth).toLocaleString('pt-BR', { month: 'long' });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Painel de Manutenção</h1>
        <button
          onClick={exportToXLSX}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          title="Exportar dados filtrados para Excel (XLSX)"
        >
          <Download className="h-5 w-5" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Filter className="h-5 w-5" />
            <span>Filtros:</span>
          </div>

          {/* Year Filter */}
          <div className="relative w-full sm:w-auto">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto text-sm pl-3 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
              <option value="ALL">Todos os Anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Month Filter */}
          <div className="relative w-full sm:w-auto">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto text-sm pl-3 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
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
            <select value={selectedTechnician} onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full sm:w-auto text-sm pl-10 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" aria-label="Filtrar por técnico">
              <option value="ALL">Todos os Técnicos</option>
              {technicians.map(tech => <option key={tech} value={tech}>{tech}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Region Filter */}
          <div className="relative w-full sm:w-auto">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full sm:w-auto text-sm pl-10 pr-8 py-2 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" aria-label="Filtrar por região">
              <option value="ALL">Todas as Regiões</option>
              {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        <KPI title="Total de Tarefas" value={kpis.total} icon={<ListChecks className="h-8 w-8 text-gray-500" />} />
        <KPI title="Atrasadas" value={kpis.late} icon={<AlertTriangle className="h-8 w-8 text-red-500" />} />
        <KPI title="Em Dia" value={kpis.onSchedule} icon={<CheckCircle className="h-8 w-8 text-green-500" />} />
        <KPI title="Em Andamento" value={kpis.inProgress} icon={<Play className="h-8 w-8 text-yellow-500" />} />
        <KPI title="Programadas" value={kpis.planned} icon={<Calendar className="h-8 w-8 text-blue-500" />} />
        <KPI title="Pendentes" value={kpis.pending} icon={<Hourglass className="h-8 w-8 text-gray-500" />} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Visão Geral Tipo de Manutenção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {detailedStatusCounts.length > 0 ? detailedStatusCounts.map(status => (
            status && <DetailedStatusCard key={status.title} {...status} />
          )) : <p className="col-span-full text-center text-gray-500">Sem dados para o período selecionado.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Distribuição de Status</h2>
          <StatusDistributionChart data={filteredTasks} />
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Tarefas por Região</h2>
          <TasksByRegionChart data={filteredTasks} selectedYear={selectedYear} selectedMonth={selectedMonth} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Tarefas por Técnico</h2>
        <TasksByTechnicianChart data={filteredTasks} selectedYear={selectedYear} selectedMonth={selectedMonth} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">
          Evolução Mensal de Tarefas {chartYear && monthName ? `(${monthName} ${chartYear})` : ''}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Mostra o progresso das tarefas agendadas para um mês específico.
        </p>
        <MonthlyTasksEvolutionChart data={filteredTasks} year={chartYear} month={chartMonth} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Todas as Tarefas de Manutenção</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar cliente, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium mr-2">Filtrar por status:</span>
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value as Status | 'ALL')}
              className={`px-4 py-2 text-sm font-semibold rounded-full flex items-center transition-all duration-200 ${selectedStatus === option.value
                ? option.activeColor
                : option.inactiveColor
                }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <MaintenanceTaskCard
                  key={task.id}
                  task={task}
                  activeFilter={selectedStatus}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Nenhuma tarefa encontrada com os seus critérios.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
