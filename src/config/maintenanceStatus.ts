import {
  Clock,
  Calendar,
  CalendarCheck,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Configuração centralizada de status de manutenção
export interface MaintenanceStatus {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
  description: string;
  order: number;
}

export const maintenanceStatuses: Record<string, MaintenanceStatus> = {
  pending: {
    key: 'pending',
    label: 'Pendente',
    color: '#9ca3af',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: Clock,
    description: 'Manutenção sem data definida',
    order: 1
  },
  scheduled: {
    key: 'scheduled',
    label: 'Agendada',
    color: '#3b82f6',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: Calendar,
    description: 'Manutenção agendada',
    order: 2
  },
  in_progress: {
    key: 'in_progress',
    label: 'Em Andamento',
    color: '#f59e0b',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: PlayCircle,
    description: 'Manutenção em andamento',
    order: 3
  },
  completed: {
    key: 'completed',
    label: 'Concluída',
    color: '#10b981',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: CheckCircle,
    description: 'Manutenção concluída',
    order: 4
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelada',
    color: '#ef4444',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: XCircle,
    description: 'Manutenção cancelada',
    order: 5
  },
  overdue: {
    key: 'overdue',
    label: 'Atrasada',
    color: '#dc2626',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
    icon: AlertCircle,
    description: 'Manutenção atrasada',
    order: 6
  }
};

// Função para obter informações do status
export function getMaintenanceStatusInfo(status: string): MaintenanceStatus {
  const normalizedStatus = status?.toLowerCase().trim();

  // Mapeamentos para compatibilidade com valores antigos
  const legacyMappings: Record<string, string> = {
    'pendente': 'pending',
    'agendada': 'scheduled',
    'agendado': 'scheduled',
    'confirmada': 'scheduled', // Mapeia antigo confirmed para scheduled
    'confirmado': 'scheduled', // Mapeia antigo confirmed para scheduled
    'em andamento': 'in_progress',
    'em_andamento': 'in_progress',
    'concluída': 'completed',
    'concluído': 'completed',
    'concluida': 'completed',
    'concluido': 'completed',
    'cancelada': 'cancelled',
    'cancelado': 'cancelled',
    'atrasada': 'overdue',
    'atrasado': 'overdue'
  };

  const mappedStatus = legacyMappings[normalizedStatus] || normalizedStatus;

  return maintenanceStatuses[mappedStatus] || maintenanceStatuses.pending;
}

// Função para obter a cor do status
export function getStatusColor(status: string): string {
  return getMaintenanceStatusInfo(status).color;
}

// Função para obter o ícone do status
export function getStatusIcon(status: string) {
  return getMaintenanceStatusInfo(status).icon;
}

// Função para obter a classe CSS de background
export function getStatusBgClass(status: string): string {
  return getMaintenanceStatusInfo(status).bgColor;
}

// Função para obter a classe CSS de borda
export function getStatusBorderClass(status: string): string {
  return getMaintenanceStatusInfo(status).borderClass;
}

// Função para verificar se pode transicionar de um status para outro
export function canTransitionStatus(fromStatus: string, toStatus: string): boolean {
  const from = getMaintenanceStatusInfo(fromStatus);
  const to = getMaintenanceStatusInfo(toStatus);

  // Regras de transição atualizadas:
  // - Cancelamento permitido a qualquer momento
  // - Atrasada pode ser marcada a qualquer momento
  const allowedTransitions: Record<string, string[]> = {
    pending: ['scheduled', 'cancelled', 'overdue'],
    scheduled: ['in_progress', 'cancelled', 'overdue'],
    in_progress: ['completed', 'cancelled', 'overdue'],
    completed: ['cancelled'], // Pode cancelar mesmo depois de concluída
    cancelled: ['pending', 'scheduled'], // Pode reabrir como pendente ou reagendar
    overdue: ['scheduled', 'in_progress', 'completed', 'cancelled']
  };

  return allowedTransitions[from.key]?.includes(to.key) || false;
}

// Lista de status disponíveis para seleção em formulários
export function getSelectableStatuses(currentStatus?: string): MaintenanceStatus[] {
  const current = currentStatus ? getMaintenanceStatusInfo(currentStatus) : null;

  if (!current) {
    return Object.values(maintenanceStatuses).sort((a, b) => a.order - b.order);
  }

  // Retornar apenas status válidos para transição
  const allowedKeys = ['pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'overdue'];
  const statuses = allowedKeys
    .filter(key => key === current.key || canTransitionStatus(current.key, key))
    .map(key => maintenanceStatuses[key]);

  return statuses.sort((a, b) => a.order - b.order);
}

// Função para determinar se uma manutenção está atrasada
export function isMaintenanceOverdue(scheduledDate: string | null, status: string): boolean {
  if (!scheduledDate) return false;

  const statusInfo = getMaintenanceStatusInfo(status);
  // Já está marcada como atrasada
  if (statusInfo.key === 'overdue') return true;

  // Só mostra indicador de atraso automático se estiver em status scheduled
  // Mas permite marcar manualmente como atrasada a qualquer momento
  if (statusInfo.key !== 'scheduled') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);

  return scheduled < today;
}