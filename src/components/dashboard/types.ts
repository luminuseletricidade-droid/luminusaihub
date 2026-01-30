export type Status = 'EM DIA' | 'EM ATRASO' | 'PROGRAMADO' | 'PENDENTE' | 'EM ANDAMENTO' | null;

// Interface para uma manutenção individual
export interface MaintenanceItem {
  id: string;
  type: string;
  date: string | null;
  status: Status;
  technician: string | null;
}

// Interface principal - um card por contrato com lista de manutenções
export interface MaintenanceTask {
  id: string;  // contract_id
  client: string;
  code: string;  // contract_number / equipment code
  powerKVA: number | null;
  region: string;
  technician: string | null;
  // Lista de manutenções do contrato
  maintenances: MaintenanceItem[];
  // Campos do tipo e status da manutenção real do banco (para compatibilidade)
  maintenanceType: string | null;
  maintenanceStatus: Status;
  maintenanceDate: string | null;
  // Campos legados para compatibilidade
  monthlyMaintenanceDate: string | null;
  monthlyMaintenanceStatus: Status;
  '250hMaintenanceDate': string | null;
  '250hMaintenanceStatus': Status;
  tankCleaningDate: string | null;
  tankCleaningStatus: Status;
  alternatorMeggerDate: string | null;
  alternatorMeggerStatus: Status;
  radiatorMeggerDate: string | null;
  radiatorMeggerStatus: Status;
  radiatorCleaningDate: string | null;
  radiatorCleaningStatus: Status;
  valveRegulationDate: string | null;
  valveRegulationStatus: Status;
  '500hMaintenanceDate': string | null;
  '500hMaintenanceStatus': Status;
  batteryDate: string | null;
  batteryStatus: Status;
  backlog: string | null;
  observations: string | null;
}

// Interface para Relatório 2 - Backlogs Recorrentes
export interface BacklogTask {
  id: string;
  contract_id: string;
  client: string;
  code: string; // contract_number
  type: string; // maintenance_type_name
  typeCode: string; // maintenance_type_code
  scheduledDate: string | null;
  completedDate: string | null;
  daysOpen: number;
  status: Status;
  dbStatus: string; // status original do banco
  rescheduleCount: number;
  progress: number;
  recommendation: string | null;
  technician: string | null;
  notes: string | null;
  isCriticalBacklog: boolean;
  isRescheduled: boolean;
  createdAt: string;
  updatedAt: string;
  region?: string; // região do contrato
  powerKVA?: number; // potência em KVA
}

// Interface para KPIs do Relatório de Backlogs
export interface BacklogKPIs {
  totalBacklogs: number;
  criticalBacklogs: number; // >30 dias
  onSchedule: number; // concluídas no período
  rescheduled: number; // reprogramadas
  avgDaysOpen: number;
}

// Interface para dados da Curva S
export interface CurvaSDataPoint {
  semana: number;
  dataInicio: string;
  dataFim: string;
  planejadoSemana: number;
  planejadoAcumulado: number;
  realSemana: number;
  realAcumulado: number;
  planejadoPercent: number;
  realPercent: number;
}

// Interface para resumo do relatório de backlogs
export interface BacklogSummary {
  total_backlogs: number;
  critical_backlogs: number;
  avg_days_open: number;
  total_rescheduled: number;
  max_reschedule_count: number;
}
