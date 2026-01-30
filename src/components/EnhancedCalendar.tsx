import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// Importar e configurar locale ANTES de qualquer uso
import 'moment/locale/pt-br';
import { formatDateToISO } from '@/lib/dateUtils';
import { formatDateSafe } from '@/utils/formatters';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Eye,
  Clock,
  Users,
  Settings,
  AlertCircle,
  Info
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { maintenancesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api.config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isBusinessDay, adjustToBusinessDay } from '@/utils/businessDays';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Configurar locale pt-BR COMPLETAMENTE antes de criar o localizer
moment.locale('pt-br');
moment.updateLocale('pt-br', {
  weekdays: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  weekdaysMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  week: {
    dow: 1, // Segunda-feira é o primeiro dia da semana
    doy: 4  // A semana que contém Jan 4 é a primeira semana do ano
  }
});

// Criar localizer APÓS configurar completamente o locale
const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  // Timestamp pré-calculado para filtragem rápida (evita criar Date objects no filtro)
  _startTimestamp?: number;
  resource?: {
    type: 'maintenance' | 'contract' | 'service';
    contractId: string;
    contractNumber: string;
    clientName: string;
    description?: string;
    status?: string;
    technician?: string;
    regionId?: string;
    regionName?: string;
    regionColor?: string;
    observations?: string;
  };
}

interface EnhancedCalendarProps {
  userId?: string;
}

// Array de anos pré-calculado (evita recriação a cada render)
const YEARS_ARRAY = Array.from({length: 10}, (_, i) => moment().year() - 5 + i);

// CustomToolbar extraído como componente memoizado para evitar re-mount dos Select
interface CustomToolbarProps {
  date: Date;
  view: View;
  label: string;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', date?: Date) => void;
  onView: (view: View) => void;
}

const CustomToolbar = React.memo(({ date, view, label, onNavigate, onView }: CustomToolbarProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('📅 Clique em Hoje');
            onNavigate('TODAY');
          }}
          className="bg-white hover:bg-blue-50 border-blue-300"
        >
          Hoje
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              console.log('📅 [CALENDAR] Clique em PREV, data atual:', date);
              onNavigate('PREV');
            }}
            className="bg-white w-8 h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              console.log('📅 [CALENDAR] Clique em NEXT, data atual:', date);
              onNavigate('NEXT');
            }}
            className="bg-white w-8 h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dynamic Date Selector based on view */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-gray-900">
            {label}
          </span>

          {/* Month/Year Selectors - always visible for quick navigation */}
          <div className="flex items-center gap-2">
            <Select
              value={moment(date).format('M')}
              onValueChange={(monthValue) => {
                console.log('📅 [CALENDAR] Seletor de mês alterado:', { monthValue, currentDate: date });
                const newDate = moment(date).month(parseInt(monthValue) - 1).toDate();
                console.log('📅 [CALENDAR] Nova data calculada:', newDate);
                onNavigate('DATE', newDate);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Março</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Maio</SelectItem>
                <SelectItem value="6">Junho</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={moment(date).format('YYYY')}
              onValueChange={(yearValue) => {
                console.log('📅 [CALENDAR] Seletor de ano alterado:', { yearValue, currentDate: date });
                const newDate = moment(date).year(parseInt(yearValue)).toDate();
                console.log('📅 [CALENDAR] Nova data calculada:', newDate);
                onNavigate('DATE', newDate);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {YEARS_ARRAY.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('day')}
          className={view === 'day' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}
        >
          Dia
        </Button>
        <Button
          variant={view === 'work_week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('work_week')}
          className={view === 'work_week' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}
        >
          Semana Útil
        </Button>
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('month')}
          className={view === 'month' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}
        >
          Mês
        </Button>
        <Button
          variant={view === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('agenda')}
          className={view === 'agenda' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}
        >
          Agenda
        </Button>
      </div>
    </div>
  );
});
CustomToolbar.displayName = 'CustomToolbar';

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({ userId }) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [datePickerOpen, setDatePickerOpen] = useState(false); // Removed - using month/year selectors now
  
  // New maintenance dialog
  const [showNewMaintenanceDialog, setShowNewMaintenanceDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Filters
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<unknown[]>([]);

  // Load contracts from Backend API - moved here to avoid initialization error
  const loadContracts = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[EnhancedCalendar] 🔐 Session from AuthContext in loadContracts:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token
      });

      if (!session?.access_token) {
        console.log('⏳ [EnhancedCalendar] Aguardando autenticação para carregar contratos...');
        return;
      }

      console.log('[EnhancedCalendar] 📋 Carregando contratos via Backend API...');

      // Use Backend API - already filtered by user with client_users relationship
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!contractsResponse.ok) {
        console.error('❌ [EnhancedCalendar] Erro ao carregar contratos via API:', contractsResponse.status);
        return;
      }

      const contractsData = await contractsResponse.json();
      console.log('✅ [EnhancedCalendar] Contratos carregados:', contractsData?.length || 0);

      setContracts(contractsData || []);
    } catch (error) {
      console.error('❌ [EnhancedCalendar] Error loading contracts:', error);
    }
  }, [userId, session]);

  // Load events from database
  
  // Date range filters
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>();
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>();
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  
  // New maintenance form
  const [clients, setClients] = useState<unknown[]>([]);
  const [clientContracts, setClientContracts] = useState<unknown[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string; color?: string; is_active?: boolean }[]>([]);

  // Refs para otimização de performance
  const regionsRef = useRef(regions);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Manter regionsRef sincronizado com regions state
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: '',
    technician: '',
    scheduled_time: '09:00',
    end_time: '',
    observations: '',
    region_id: ''
  });

  // Custom views in Portuguese - somente dias úteis
  const views: View[] = ['day', 'work_week', 'month', 'agenda'];
  
  // Mensagens completamente traduzidas para pt-BR
  const messages = {
    allDay: 'Dia todo',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    work_week: 'Semana Útil',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
    showMore: (total: number) => `+${total} mais`,
    tomorrow: 'Amanhã',
    yesterday: 'Ontem'
  };

  // Auto-calculate end_time when dialog opens with default scheduled_time
  useEffect(() => {
    if (showNewMaintenanceDialog && maintenanceForm.scheduled_time && maintenanceForm.end_time === "") {
      // Calculate end_time (+1 hour) when dialog opens
      const [hours, minutes] = maintenanceForm.scheduled_time.split(':').map(Number);
      const endHour = hours + 1;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      setMaintenanceForm(prev => ({
        ...prev,
        end_time: endTime
      }));
    }
  }, [showNewMaintenanceDialog, maintenanceForm.scheduled_time, maintenanceForm.end_time]);

  // Load events from database - MUST be defined before useEffect that calls it
  const loadEvents = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Load maintenances - COM FILTRO DE USER_ID
      const { data: maintenances, error: maintError } = await supabase
        .from('maintenances')
        .select('*')
        .eq('user_id', userId);

      if (maintError) throw maintError;

      // Load contracts data separately without embed to avoid relationship conflict
      const { data: contractsData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId);

      if (contractError) throw contractError;

      // Load clients data separately
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', userId);

      if (clientsError) throw clientsError;

      const calendarEvents: CalendarEvent[] = [];

      // Create a map of contracts for quick lookup
      const contractsMap = new Map();
      if (contractsData) {
        contractsData.forEach(contract => {
          contractsMap.set(contract.id, contract);
        });
      }

      // Create a map of clients for quick lookup
      const clientsMap = new Map();
      if (clientsData) {
        clientsData.forEach(client => {
          clientsMap.set(client.id, client);
        });
      }

      // Create a map of regions for quick lookup (usando ref para evitar dependency)
      const regionsMap = new Map();
      regionsRef.current.forEach(region => {
        regionsMap.set(region.id, region);
      });

      // Add maintenance events with proper status and time handling
      if (maintenances) {
        maintenances.forEach(maint => {
          if (maint.scheduled_date) {
            // CORREÇÃO TIMEZONE: Parse date and time properly, evitando conversão UTC
            // Adicionar 'T00:00:00' para forçar interpretação como horário local
            const scheduledDate = new Date(maint.scheduled_date + 'T00:00:00');

            // If scheduled_time exists, apply it
            if (maint.scheduled_time) {
              const [hours, minutes] = maint.scheduled_time.split(':');
              scheduledDate.setHours(parseInt(hours), parseInt(minutes));
            }

            // Calculate end date based on end_time (MUST be provided)
            const endDate = new Date(scheduledDate);
            if (maint.end_time && maint.end_time.trim() !== '') {
              const [endHours, endMinutes] = maint.end_time.split(':');
              endDate.setHours(parseInt(endHours), parseInt(endMinutes));
            } else {
              // AVISO: end_time não foi fornecido - isso não deveria acontecer
              console.warn(`⚠️ Manutenção ${maint.id} sem end_time definido. Usando +1h como fallback temporário.`);
              endDate.setHours(endDate.getHours() + 1);
            }

            // Get contract data from map
            const contract = contractsMap.get(maint.contract_id);

            // Get client data from map using contract's client_id
            const client = contract ? clientsMap.get(contract.client_id) : null;

            // Get client name from client data or fallback
            const clientName = client?.name ||
                              contract?.client_name ||
                              maint.client_name ||
                              'Cliente';

            const contractNumber = contract?.contract_number ||
                                  maint.contract_number ||
                                  'Não informado';

            // Get region data if available
            const region = maint.region_id ? regionsMap.get(maint.region_id) : null;

            // Pré-calcular timestamp normalizado para filtragem rápida
            const normalizedTimestamp = new Date(scheduledDate).setHours(0, 0, 0, 0);

            calendarEvents.push({
              id: maint.id,
              title: `Manutenção ${maint.type || ''} - ${clientName}`.trim(),
              start: scheduledDate,
              end: endDate,
              _startTimestamp: normalizedTimestamp,
              resource: {
                type: 'maintenance',
                contractId: maint.contract_id,
                contractNumber: contractNumber,
                clientName: clientName,
                description: maint.description || '',
                status: maint.status,
                technician: maint.technician,
                regionId: maint.region_id,
                regionName: region?.name,
                regionColor: region?.color,
                observations: maint.notes || maint.observations || ''
              }
            });
          }
        });
      }

      // Add contract milestones
      if (contractsData) {
        contractsData.forEach(contract => {
          // Contract start
          if (contract.start_date) {
            const startDate = new Date(contract.start_date + 'T00:00:00');
            calendarEvents.push({
              id: `contract-start-${contract.id}`,
              title: `Início - ${contract.client_name}`,
              start: startDate,
              end: startDate,
              _startTimestamp: startDate.getTime(),
              resource: {
                type: 'contract',
                contractId: contract.id,
                contractNumber: contract.contract_number,
                clientName: contract.client_name,
                description: 'Início do contrato'
              }
            });
          }

          // Contract end
          if (contract.end_date) {
            const endDate = new Date(contract.end_date + 'T00:00:00');
            calendarEvents.push({
              id: `contract-end-${contract.id}`,
              title: `Término - ${contract.client_name}`,
              start: endDate,
              end: endDate,
              _startTimestamp: endDate.getTime(),
              resource: {
                type: 'contract',
                contractId: contract.id,
                contractNumber: contract.contract_number,
                clientName: contract.client_name,
                description: 'Término do contrato'
              }
            });
          }

          // Removed automatic monthly service generation - only show real data
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos do calendário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]); // Removido 'regions' - usando regionsRef para evitar efeito cascata

  // Load clients from API - MUST be defined before useEffect that calls it
  const loadClients = useCallback(async () => {
    try {
      console.log('[EnhancedCalendar] 🔄 Iniciando loadClients...');

      console.log('[EnhancedCalendar] 🔐 Session from AuthContext:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: userId
      });

      if (!session?.access_token) {
        console.log('⏳ [EnhancedCalendar] Aguardando autenticação para carregar clientes...');
        return;
      }

      const apiUrl = `${API_BASE_URL}/api/clients`;
      console.log('[EnhancedCalendar] 📡 Chamando API:', apiUrl);

      // Use Backend API - already filtered by user with client_users relationship
      const clientsResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[EnhancedCalendar] 📥 Response:', {
        status: clientsResponse.status,
        ok: clientsResponse.ok,
        statusText: clientsResponse.statusText
      });

      if (!clientsResponse.ok) {
        const errorText = await clientsResponse.text();
        console.error('❌ [EnhancedCalendar] Erro ao carregar clientes:', {
          status: clientsResponse.status,
          error: errorText
        });
        toast({
          title: "Erro ao carregar clientes",
          description: `Erro HTTP ${clientsResponse.status}: ${errorText}`,
          variant: "destructive"
        });
        return;
      }

      const clientsData = await clientsResponse.json();

      console.log('✅ [EnhancedCalendar] Clientes carregados:', {
        count: clientsData?.length || 0,
        data: clientsData
      });

      setClients(clientsData || []);

      // Se não há clientes, avisar o usuário
      if (!clientsData || clientsData.length === 0) {
        console.warn('⚠️ [EnhancedCalendar] Nenhum cliente encontrado');
        toast({
          title: "Nenhum cliente cadastrado",
          description: "Cadastre clientes antes de agendar manutenções.",
          variant: "default"
        });
      }
    } catch (error: unknown) {
      console.error('❌ [EnhancedCalendar] Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message || "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
      setClients([]);
    }
  }, [session, toast]);

  // Load regions from API
  const loadRegions = useCallback(async () => {
    try {
      if (!session?.access_token) {
        return;
      }

      const apiUrl = `${API_BASE_URL}/api/regions`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ [EnhancedCalendar] Erro ao carregar regiões');
        return;
      }

      const regionsData = await response.json();
      // Filter only active regions
      const activeRegions = regionsData.filter((r: { is_active?: boolean }) => r.is_active !== false);
      setRegions(activeRegions || []);
      console.log('✅ [EnhancedCalendar] Regiões carregadas:', activeRegions?.length || 0);
    } catch (error) {
      console.error('❌ [EnhancedCalendar] Erro ao carregar regiões:', error);
      setRegions([]);
    }
  }, [session]);

  useEffect(() => {
    // Only load data if userId and session are available (user is authenticated)
    if (!userId) {
      console.log('[EnhancedCalendar] ⏳ Aguardando userId do AuthContext...');
      return;
    }

    if (!session) {
      console.log('[EnhancedCalendar] ⏳ Aguardando session do AuthContext...');
      return;
    }

    console.log('[EnhancedCalendar] ✅ userId e session disponíveis, carregando dados...');
    loadContracts();
    loadEvents();
    loadClients();
    loadRegions();

    // Set up real-time subscription for maintenances (com debounce para evitar múltiplas chamadas)
    const channel = supabase
      .channel('maintenance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenances',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          console.log('Maintenance change detected:', payload);
          // Debounce: aguardar 300ms antes de recarregar para evitar múltiplas chamadas
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          debounceTimeoutRef.current = setTimeout(() => {
            loadEvents();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Limpar timeout ao desmontar
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [userId, session, loadContracts, loadEvents, loadClients, loadRegions]);

  const loadClientContracts = async (clientId: string) => {
    if (!clientId) {
      console.error('❌ [EnhancedCalendar] loadClientContracts: clientId não fornecido');
      setClientContracts([]);
      return;
    }

    try {
      console.log('[EnhancedCalendar] 🔐 Session from AuthContext in loadClientContracts:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token
      });

      if (!session?.access_token) {
        console.log('⏳ [EnhancedCalendar] Aguardando autenticação para carregar contratos...');
        return;
      }

      console.log('📋 [EnhancedCalendar] Carregando contratos para clientId:', clientId);

      // Use Backend API - already filtered by user
      const contractsResponse = await fetch(`${API_BASE_URL}/api/contracts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!contractsResponse.ok) {
        console.error('❌ [EnhancedCalendar] Erro ao carregar contratos via API:', contractsResponse.status);
        toast({
          title: "Erro ao carregar contratos",
          description: "Não foi possível carregar os contratos do cliente.",
          variant: "destructive"
        });
        return;
      }

      const contractsData = await contractsResponse.json();

      // Filter contracts for the selected client and active status
      const filteredContracts = contractsData.filter((contract: unknown) => {
        if (!contract || !contract.client_id) return false;
        if (contract.client_id !== clientId) return false;
        const normalizedStatus = contract.status ? contract.status.toString().trim().toLowerCase() : '';
        const allowedStatuses = [
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
        ];
        return normalizedStatus === '' || allowedStatuses.includes(normalizedStatus);
      });

      console.log('✅ [EnhancedCalendar] Contratos filtrados:', filteredContracts?.length || 0);

      setClientContracts(filteredContracts || []);

      // Se não há contratos ativos para o cliente
      if (!filteredContracts || filteredContracts.length === 0) {
        console.warn('⚠️ [EnhancedCalendar] Nenhum contrato ativo encontrado para este cliente');
        toast({
          title: "Nenhum contrato ativo",
          description: "Este cliente não tem contratos ativos. Crie um contrato antes de agendar manutenções.",
          variant: "default"
        });
      }
    } catch (error: unknown) {
      console.error('❌ [EnhancedCalendar] Erro ao carregar contratos:', error);
      toast({
        title: "Erro ao carregar contratos",
        description: error.message || "Não foi possível carregar os contratos do cliente.",
        variant: "destructive"
      });
      setClientContracts([]);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedContractId('');
    
    if (clientId) {
      loadClientContracts(clientId);
    } else {
      setClientContracts([]);
    }
  };

  const handleMaintenanceSubmit = async () => {
    // Validações detalhadas com mensagens específicas
    if (!userId) {
      console.error('❌ [EnhancedCalendar] handleMaintenanceSubmit: userId não disponível');
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado. Por favor, recarregue a página.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedClientId) {
      console.warn('⚠️ [EnhancedCalendar] handleMaintenanceSubmit: Cliente não selecionado');
      toast({
        title: "Cliente obrigatório",
        description: "Por favor, selecione um cliente.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedContractId) {
      console.warn('⚠️ [EnhancedCalendar] handleMaintenanceSubmit: Contrato não selecionado');
      toast({
        title: "Contrato obrigatório",
        description: "Por favor, selecione um contrato do cliente.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate) {
      console.warn('⚠️ [EnhancedCalendar] handleMaintenanceSubmit: Data não selecionada');
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione uma data para a manutenção.",
        variant: "destructive"
      });
      return;
    }

    // VALIDAÇÃO CRÍTICA: Bloquear seleção de datas passadas via interface
    // Datas passadas só podem vir do upload automático do contrato
    // 🔧 FIX: Handle both Date objects and string dates in local timezone
    const parseLocalDate = (dateInput: Date | string) => {
      if (!dateInput) return null;
      if (dateInput instanceof Date) {
        // For Date objects, extract components and recreate to ensure local timezone
        return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
      }
      // For string dates (YYYY-MM-DD format)
      const [year, month, day] = dateInput.toString().split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data

    const selectedDateTime = parseLocalDate(selectedDate);
    if (selectedDateTime) {
      selectedDateTime.setHours(0, 0, 0, 0);
    }

    if (selectedDateTime && selectedDateTime < now) {
      console.error('❌ [EnhancedCalendar] Tentativa de agendar para data passada bloqueada');
      toast({
        title: "Data inválida",
        description: "Não é permitido agendar manutenções para datas passadas. Por favor, selecione uma data de hoje em diante.",
        variant: "destructive"
      });
      return;
    }

    if (!maintenanceForm.maintenance_type) {
      console.warn('⚠️ [EnhancedCalendar] handleMaintenanceSubmit: Tipo de manutenção não selecionado');
      toast({
        title: "Tipo de manutenção obrigatório",
        description: "Por favor, selecione o tipo de manutenção.",
        variant: "destructive"
      });
      return;
    }

    if (!maintenanceForm.technician) {
      console.warn('⚠️ [EnhancedCalendar] handleMaintenanceSubmit: Técnico não informado');
      toast({
        title: "Técnico obrigatório",
        description: "Por favor, informe o nome do técnico responsável.",
        variant: "destructive"
      });
      return;
    }

    if (!maintenanceForm.end_time) {
      toast({
        title: "Horário fim obrigatório",
        description: "Por favor, informe o horário de término da manutenção.",
        variant: "destructive"
      });
      return;
    }

    // Validar que horário fim é posterior ao horário início
    if (maintenanceForm.scheduled_time && maintenanceForm.end_time) {
      const [startHour, startMin] = maintenanceForm.scheduled_time.split(':').map(Number);
      const [endHour, endMin] = maintenanceForm.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        toast({
          title: "Horário inválido",
          description: "O horário de término deve ser posterior ao horário de início.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Get contract and client details for better data consistency
      const selectedContract = clientContracts.find(c => c.id === selectedContractId);
      const selectedClient = clients.find(c => c.id === selectedClientId);

      // Prepare maintenance data
      const maintenanceData = {
        contract_id: selectedContractId,
        user_id: userId,
        type: maintenanceForm.maintenance_type,
        scheduled_date: formatDateToISO(selectedDate),
        scheduled_time: maintenanceForm.scheduled_time,
        end_time: maintenanceForm.end_time, // Agora é obrigatório, não pode ser null/vazio
        technician: maintenanceForm.technician,
        status: 'scheduled',
        notes: maintenanceForm.observations,
        description: `Manutenção ${maintenanceForm.maintenance_type} agendada`,
        client_name: selectedClient?.name || '',
        contract_number: selectedContract?.contract_number || '',
        region_id: maintenanceForm.region_id || null
      };

      console.log('🔍 [CALENDAR] Dados de manutenção sendo criados:', {
        scheduled_date: maintenanceData.scheduled_date,
        scheduled_time: maintenanceData.scheduled_time,
        end_time: maintenanceData.end_time,
        end_time_type: typeof maintenanceData.end_time
      });
      console.log('🔍 [CALENDAR] Payload COMPLETO:', JSON.stringify(maintenanceData, null, 2));

      // Use the backend API instead of direct Supabase call
      const data = await maintenancesApi.create(maintenanceData);

      console.log('🔍 [CALENDAR] Dados RETORNADOS pela API:', JSON.stringify(data, null, 2));
      console.log('🔍 [CALENDAR] end_time RETORNADO:', data?.end_time);

      if (!data || !data.id) {
        throw new Error('Falha ao criar manutenção');
      }

      toast({
        title: "Manutenção agendada",
        description: "Manutenção foi agendada com sucesso!"
      });

      // Reset form and close dialog
      setShowNewMaintenanceDialog(false);
      setMaintenanceForm({
        maintenance_type: '',
        technician: '',
        scheduled_time: '09:00',
        end_time: '',
        observations: '',
        region_id: ''
      });
      setSelectedClientId('');
      setSelectedContractId('');
      setClientContracts([]);
      setSelectedDate(null);

      // Reload events to show the new maintenance immediately
      await loadEvents();
    } catch (error) {
      console.error('Erro ao agendar manutenção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar a manutenção.",
        variant: "destructive"
      });
    }
  };

  const filteredEvents = useMemo(() => {
    console.log('🔍 [CALENDAR FILTER] Aplicando filtros:', {
      totalEvents: events.length,
      contractFilter,
      typeFilter,
      searchTerm,
      hasStartDateFilter: !!startDateFilter,
      hasEndDateFilter: !!endDateFilter
    });

    // Pré-calcular timestamps dos filtros FORA do loop (otimização de performance)
    const startFilterTimestamp = startDateFilter
      ? new Date(startDateFilter).setHours(0, 0, 0, 0)
      : null;
    const endFilterTimestamp = endDateFilter
      ? new Date(endDateFilter).setHours(23, 59, 59, 999)
      : null;
    const searchLower = searchTerm?.toLowerCase().trim() || '';

    const filtered = events.filter(event => {
      // Filter by contract
      if (contractFilter !== 'all' && event.resource?.contractId !== contractFilter) {
        return false;
      }

      // Filter by type
      if (typeFilter !== 'all' && event.resource?.type !== typeFilter) {
        return false;
      }

      // Filter by date range - OTIMIZADO: usando _startTimestamp pré-calculado
      if (startFilterTimestamp !== null) {
        const eventTimestamp = event._startTimestamp ?? new Date(event.start).setHours(0, 0, 0, 0);
        if (eventTimestamp < startFilterTimestamp) {
          return false;
        }
      }

      if (endFilterTimestamp !== null) {
        const eventTimestamp = event._startTimestamp ?? new Date(event.start).setHours(0, 0, 0, 0);
        if (eventTimestamp > endFilterTimestamp) {
          return false;
        }
      }

      // Filter by search term
      if (searchLower) {
        const matches = (
          event.title.toLowerCase().includes(searchLower) ||
          event.resource?.clientName?.toLowerCase().includes(searchLower) ||
          event.resource?.description?.toLowerCase().includes(searchLower) ||
          event.resource?.contractNumber?.toLowerCase().includes(searchLower) ||
          event.resource?.technician?.toLowerCase().includes(searchLower)
        );

        if (!matches) {
          return false;
        }
      }

      return true;
    });

    console.log(`✅ [CALENDAR FILTER] Resultado: ${filtered.length} de ${events.length} eventos`);
    return filtered;
  }, [events, contractFilter, typeFilter, searchTerm, startDateFilter, endDateFilter]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleSelectSlot = (slotInfo: unknown) => {
    // Handle clicking on empty calendar slots to create new maintenance
    console.log('📅 Slot selecionado:', slotInfo);
    console.log('📅 Data original do slot:', slotInfo.start);

    // CORREÇÃO TIMEZONE: Criar data local sem conversão de timezone
    // Usar getUTCFullYear, getUTCMonth, getUTCDate para evitar problemas de timezone
    const clickedDate = new Date(slotInfo.start);
    const localDate = new Date(
      clickedDate.getUTCFullYear(),
      clickedDate.getUTCMonth(),
      clickedDate.getUTCDate(),
      12, // Meio-dia para evitar problemas de DST
      0,
      0
    );

    console.log('📅 Data convertida para local:', localDate);
    console.log('📅 Dia/Mês/Ano:', localDate.getDate(), localDate.getMonth() + 1, localDate.getFullYear());

    setSelectedDate(localDate);
    setShowNewMaintenanceDialog(true);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';

    if (event.resource?.type === 'maintenance') {
      // Color code by status
      switch (event.resource.status) {
        case 'scheduled':
          backgroundColor = '#3b82f6'; // Blue for scheduled
          break;
        case 'in_progress':
          backgroundColor = '#f59e0b'; // Amber for in progress
          break;
        case 'completed':
          backgroundColor = '#10b981'; // Green for completed
          break;
        case 'cancelled':
          backgroundColor = '#6b7280'; // Gray for cancelled
          break;
        default:
          backgroundColor = '#8b5cf6'; // Purple for default
      }
    } else if (event.resource?.type === 'contract') {
      backgroundColor = '#27ae60'; // Green for contract milestones
    } else if (event.resource?.type === 'service') {
      backgroundColor = '#3498db'; // Blue for services
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const exportCalendar = () => {
    // CORREÇÃO: Sempre exportar os eventos VISÍVEIS (filteredEvents)
    // Se não há filtros, filteredEvents === events, então é sempre correto usar filteredEvents
    console.log('📥 [CALENDAR EXPORT] Exportando eventos:', {
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
      hasContractFilter: contractFilter !== 'all',
      hasTypeFilter: typeFilter !== 'all',
      hasSearchTerm: !!searchTerm,
      hasDateRange: !!(startDateFilter || endDateFilter)
    });

    if (filteredEvents.length === 0) {
      toast({
        title: "Nenhum evento para exportar",
        description: "Não há eventos visíveis com os filtros aplicados",
        variant: "default"
      });
      return;
    }

    // Escape CSV values to handle commas, quotes, and newlines
    const escapeCSV = (value: string) => {
      if (!value) return '';
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = filteredEvents.map(event => {
      return [
        escapeCSV(event.title),
        moment(event.start).format('DD/MM/YYYY HH:mm'),
        moment(event.end).format('DD/MM/YYYY HH:mm'),
        escapeCSV(event.resource?.type === 'maintenance' ? 'Manutenção' :
                  event.resource?.type === 'contract' ? 'Marco Contratual' :
                  event.resource?.type === 'service' ? 'Serviço' : ''),
        escapeCSV(event.resource?.clientName || ''),
        escapeCSV(event.resource?.contractNumber || ''),
        escapeCSV(event.resource?.regionName || ''),
        escapeCSV(event.resource?.status === 'scheduled' ? 'Agendada' :
                  event.resource?.status === 'in_progress' ? 'Em Andamento' :
                  event.resource?.status === 'completed' ? 'Concluída' :
                  event.resource?.status === 'cancelled' ? 'Cancelada' :
                  event.resource?.status === 'overdue' ? 'Atrasada' : ''),
        escapeCSV(event.resource?.technician || ''),
        escapeCSV(event.resource?.description || ''),
        escapeCSV(event.resource?.observations || '')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + // BOM for Excel UTF-8 support
      'Título,Início,Fim,Tipo,Cliente,Contrato,Região,Status,Técnico,Descrição,Observação\n' +
      csv.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `calendario_${moment().format('YYYY-MM-DD_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ [CALENDAR EXPORT] ${filteredEvents.length} eventos exportados com sucesso`);

    toast({
      title: "Calendário exportado",
      description: `${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''} exportado${filteredEvents.length !== 1 ? 's' : ''} com sucesso`,
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6 p-2 lg:p-0">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendário de Serviços
            </CardTitle>
            <Button onClick={exportCalendar} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date Range Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDateFilter ? formatDateSafe(startDateFilter) : "Selecionar data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <UICalendar
                    mode="single"
                    selected={startDateFilter}
                    onSelect={(date) => {
                      setStartDateFilter(date);
                      setStartDatePopoverOpen(false);
                    }}
                    allowWeekends={true}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDateFilter ? formatDateSafe(endDateFilter) : "Selecionar data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <UICalendar
                    mode="single"
                    selected={endDateFilter}
                    onSelect={(date) => {
                      setEndDateFilter(date);
                      setEndDatePopoverOpen(false);
                    }}
                    allowWeekends={true}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setStartDateFilter(undefined);
                  setEndDateFilter(undefined);
                }}
              >
                Limpar Filtros de Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date();
                  nextWeek.setDate(today.getDate() + 7);
                  setStartDateFilter(today);
                  setEndDateFilter(nextWeek);
                }}
              >
                Próximos 7 dias
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date();
                  const nextMonth = new Date();
                  nextMonth.setDate(today.getDate() + 30);
                  setStartDateFilter(today);
                  setEndDateFilter(nextMonth);
                }}
              >
                Próximos 30 dias
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contrato</label>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os contratos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os contratos</SelectItem>
                  {contracts.map(contract => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="maintenance">Manutenções</SelectItem>
                  <SelectItem value="service">Serviços</SelectItem>
                  <SelectItem value="contract">Marcos Contratuais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estatísticas</label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-semibold">
                  {filteredEvents.length} total
                </Badge>
                <Badge variant="outline" className="bg-blue-50">
                  {filteredEvents.filter(e => e.resource?.type === 'maintenance').length} manutenções
                </Badge>
                <Badge variant="outline" className="bg-green-50">
                  {filteredEvents.filter(e => e.resource?.type === 'contract').length} marcos contratuais
                </Badge>
                <Badge variant="outline" className="bg-blue-100">
                  {filteredEvents.filter(e => e.resource?.status === 'scheduled').length} agendadas
                </Badge>
                <Badge variant="outline" className="bg-amber-50">
                  {filteredEvents.filter(e => e.resource?.status === 'in_progress').length} em andamento
                </Badge>
                <Badge variant="outline" className="bg-green-100">
                  {filteredEvents.filter(e => e.resource?.status === 'completed').length} concluídas
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card className="p-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Legenda de Status</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-muted-foreground">Agendada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-muted-foreground">Em Andamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Concluída</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-xs text-muted-foreground">Cancelada</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="p-2 sm:p-4 lg:p-6">
        <div className="h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={(newView) => setView(newView)}
            views={views}
            date={date}
            onNavigate={(newDate, view, action) => {
              console.log('📅 [CALENDAR] onNavigate chamado:', { newDate, view, action, currentDate: date });
              setDate(newDate);
            }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            messages={messages}
            culture="pt-BR"
            formats={{
              monthHeaderFormat: 'MMMM YYYY',
              weekdayFormat: 'ddd',
              dayFormat: 'DD',
              dayRangeHeaderFormat: ({ start, end }) =>
                `${moment(start).format('DD MMM')} - ${moment(end).format('DD MMM YYYY')}`,
              agendaDateFormat: 'DD/MM/YYYY',
              agendaTimeFormat: 'HH:mm',
              agendaTimeRangeFormat: ({ start, end }) =>
                `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
            }}
            dayPropGetter={(date) => {
              // Permitir todos os dias, incluindo finais de semana
              return {};
            }}
            components={{
              event: ({ event }: { event: CalendarEvent }) => {
                // Custom event component with tooltip
                const getStatusColor = () => {
                  if (event.resource?.status === 'completed') return 'bg-green-100 text-green-800';
                  if (event.resource?.status === 'in_progress') return 'bg-amber-100 text-amber-800';
                  if (event.resource?.status === 'cancelled') return 'bg-gray-100 text-gray-800';
                  return 'bg-blue-100 text-blue-800';
                };

                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-full p-1 cursor-pointer">
                          <div className="flex items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {event.title}
                              </div>
                              {event.resource?.status && (
                                <div className="mt-0.5">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor()}`}>
                                    {event.resource.status === 'scheduled' ? 'Agendada' :
                                     event.resource.status === 'in_progress' ? 'Em Andamento' :
                                     event.resource.status === 'completed' ? 'Concluída' :
                                     event.resource.status === 'cancelled' ? 'Cancelada' :
                                     event.resource.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div className="space-y-2 p-1">
                          <div>
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {moment(event.start).format('DD/MM/YYYY HH:mm')} -
                              {moment(event.end).format('HH:mm')}
                            </p>
                          </div>
                          {event.resource && (
                            <>
                              <div className="text-sm">
                                <span className="font-medium">Cliente:</span> {event.resource.clientName}
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Contrato:</span> {event.resource.contractNumber}
                              </div>
                              {event.resource.technician && (
                                <div className="text-sm">
                                  <span className="font-medium">Técnico:</span> {event.resource.technician}
                                </div>
                              )}
                              {event.resource.description && (
                                <div className="text-sm">
                                  <span className="font-medium">Descrição:</span> {event.resource.description}
                                </div>
                              )}
                              {event.resource.status && (
                                <div className="flex gap-2">
                                  <Badge variant={
                                    event.resource.status === 'completed' ? 'success' :
                                    event.resource.status === 'in_progress' ? 'warning' :
                                    event.resource.status === 'cancelled' ? 'secondary' :
                                    'default'
                                  } className="text-xs">
                                    {event.resource.status === 'scheduled' ? 'Agendada' :
                                     event.resource.status === 'in_progress' ? 'Em Andamento' :
                                     event.resource.status === 'completed' ? 'Concluída' :
                                     event.resource.status === 'cancelled' ? 'Cancelada' :
                                     event.resource.status}
                                  </Badge>
                                </div>
                              )}
                              <div className="pt-1 text-xs text-muted-foreground">
                                Clique para mais detalhes
                              </div>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              },
              agenda: {
                event: ({ event }: { event: CalendarEvent }) => {
                  // Custom agenda event with full status information
                  return (
                    <div className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded cursor-pointer"
                         onClick={() => handleSelectEvent(event)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {event.resource?.clientName} • {event.resource?.contractNumber}
                        </div>
                        {event.resource?.technician && (
                          <div className="text-sm text-muted-foreground">
                            <Users className="inline h-3 w-3 mr-1" />
                            {event.resource.technician}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          event.resource?.status === 'completed' ? 'success' :
                          event.resource?.status === 'in_progress' ? 'warning' :
                          event.resource?.status === 'cancelled' ? 'secondary' :
                          'default'
                        }>
                          {event.resource?.status === 'scheduled' ? 'Agendada' :
                           event.resource?.status === 'in_progress' ? 'Em Andamento' :
                           event.resource?.status === 'completed' ? 'Concluída' :
                           event.resource?.status === 'cancelled' ? 'Cancelada' :
                           event.resource?.status || 'Sem status'}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                }
              },
              toolbar: CustomToolbar
            }}
            tooltipAccessor={(event: CalendarEvent) => {
              // Provide tooltip text for accessibility
              return `${event.title} - ${event.resource?.clientName || ''} - ${event.resource?.status || ''}`;
            }}
            // Show more event info on hover
            showMultiDayTimes
          />
        </div>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{selectedEvent.title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium">
                    {moment(selectedEvent.start).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fim</p>
                  <p className="font-medium">
                    {moment(selectedEvent.end).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
              </div>

              {selectedEvent.resource && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedEvent.resource.clientName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Contrato</p>
                    <p className="font-medium">{selectedEvent.resource.contractNumber}</p>
                  </div>

                  {selectedEvent.resource.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="font-medium">{selectedEvent.resource.description}</p>
                    </div>
                  )}

                  {selectedEvent.resource.technician && (
                    <div>
                      <p className="text-sm text-muted-foreground">Técnico</p>
                      <p className="font-medium">{selectedEvent.resource.technician}</p>
                    </div>
                  )}

                  {selectedEvent.resource.status && (
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={
                        selectedEvent.resource.status === 'completed' ? 'success' :
                        selectedEvent.resource.status === 'in_progress' ? 'warning' :
                        selectedEvent.resource.status === 'overdue' ? 'destructive' :
                        selectedEvent.resource.status === 'cancelled' ? 'secondary' :
                        'default'
                      }>
                        {selectedEvent.resource.status === 'scheduled' ? 'Agendada' :
                         selectedEvent.resource.status === 'in_progress' ? 'Em Andamento' :
                         selectedEvent.resource.status === 'completed' ? 'Concluída' :
                         selectedEvent.resource.status === 'overdue' ? 'Atrasada' :
                         selectedEvent.resource.status === 'cancelled' ? 'Cancelada' :
                         selectedEvent.resource.status}
                      </Badge>
                    </div>
                  )}

                  {selectedEvent.resource.regionName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Região</p>
                      <div className="flex items-center gap-2">
                        {selectedEvent.resource.regionColor && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedEvent.resource.regionColor }}
                          />
                        )}
                        <p className="font-medium">{selectedEvent.resource.regionName}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.resource.observations && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedEvent.resource.observations}</p>
                    </div>
                  )}

                  <div>
                    <Badge variant={
                      selectedEvent.resource.type === 'maintenance' ? 'warning' :
                      selectedEvent.resource.type === 'service' ? 'default' :
                      'success'
                    }>
                      {selectedEvent.resource.type === 'maintenance' ? 'Manutenção' :
                       selectedEvent.resource.type === 'service' ? 'Serviço' :
                       'Marco Contratual'}
                    </Badge>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Maintenance Dialog */}
      <Dialog open={showNewMaintenanceDialog} onOpenChange={setShowNewMaintenanceDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Agendar Nova Manutenção
              {selectedDate && ` - ${formatDateSafe(selectedDate)}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={selectedClientId} onValueChange={handleClientChange} disabled={!clients || clients.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione um cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum cliente cadastrado.<br/>Cadastre clientes antes de agendar manutenções.
                      </div>
                    ) : (
                      clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Contrato *</Label>
                <Select
                  value={selectedContractId}
                  onValueChange={setSelectedContractId}
                  disabled={!selectedClientId || clientContracts.length === 0}
                >
                  <SelectTrigger className="w-full overflow-hidden">
                    <SelectValue
                      className="truncate"
                      placeholder={
                        !selectedClientId
                          ? "Primeiro selecione um cliente"
                          : clientContracts.length === 0
                            ? "Nenhum contrato ativo"
                            : "Selecione um contrato"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-[280px]">
                    {clientContracts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {selectedClientId ? (
                          <>Nenhum contrato ativo para este cliente.<br/>Crie um contrato antes de agendar manutenções.</>
                        ) : (
                          "Selecione um cliente primeiro."
                        )}
                      </div>
                    ) : (
                      clientContracts.map(contract => (
                        <SelectItem key={contract.id} value={contract.id} className="max-w-full">
                          <div className="flex flex-col w-full overflow-hidden">
                            <span className="font-medium truncate text-sm" title={contract.contract_number}>
                              {contract.contract_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {contract.status === 'active' ? 'Ativo' : 'Em Renovação'} • {contract.start_date ? formatDateSafe(contract.start_date) : ''} - {contract.end_date ? formatDateSafe(contract.end_date) : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Manutenção *</Label>
                <Select
                  value={maintenanceForm.maintenance_type}
                  onValueChange={(value) => setMaintenanceForm(prev => ({...prev, maintenance_type: value}))}
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
                <Label>Horário Início *</Label>
                <Input
                  type="time"
                  value={maintenanceForm.scheduled_time}
                  onChange={(e) => {
                    const startTime = e.target.value;
                    // Auto-calculate end_time (+1 hour)
                    if (startTime) {
                      const [hours, minutes] = startTime.split(':').map(Number);
                      const endHour = hours + 1;
                      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      setMaintenanceForm(prev => ({
                        ...prev,
                        scheduled_time: startTime,
                        end_time: endTime
                      }));
                    } else {
                      setMaintenanceForm(prev => ({...prev, scheduled_time: startTime}));
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Horário Fim *</Label>
                <Input
                  type="time"
                  value={maintenanceForm.end_time}
                  onChange={(e) => setMaintenanceForm(prev => ({...prev, end_time: e.target.value}))}
                  min={maintenanceForm.scheduled_time}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Técnico Responsável *</Label>
                <Input
                  value={maintenanceForm.technician}
                  onChange={(e) => setMaintenanceForm(prev => ({...prev, technician: e.target.value}))}
                  placeholder="Nome do técnico"
                />
              </div>
              <div className="space-y-2">
                <Label>Região</Label>
                <Select
                  value={maintenanceForm.region_id}
                  onValueChange={(value) => setMaintenanceForm(prev => ({...prev, region_id: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={regions.length === 0 ? "Nenhuma região cadastrada" : "Selecione a região"} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhuma região cadastrada.
                      </div>
                    ) : (
                      regions.map(region => (
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
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={maintenanceForm.observations}
                onChange={(e) => setMaintenanceForm(prev => ({...prev, observations: e.target.value}))}
                placeholder="Descrição detalhada da manutenção..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewMaintenanceDialog(false);
                  setMaintenanceForm({
                    maintenance_type: '',
                    technician: '',
                    scheduled_time: '09:00',
                    end_time: '',
                    observations: '',
                    region_id: ''
                  });
                  setSelectedClientId('');
                  setSelectedContractId('');
                  setClientContracts([]);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleMaintenanceSubmit}>
                Agendar Manutenção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedCalendar;
