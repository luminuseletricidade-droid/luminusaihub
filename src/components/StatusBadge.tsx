import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  XCircle,
  Wrench,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  // Maintenance statuses
  scheduled: {
    label: 'Agendada',
    icon: Calendar,
    variant: 'secondary' as const,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: PlayCircle,
    variant: 'warning' as const,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  executing: {
    label: 'Em Execução',
    icon: Wrench,
    variant: 'warning' as const,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  reviewing: {
    label: 'Em Revisão',
    icon: AlertCircle,
    variant: 'secondary' as const,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle,
    variant: 'success' as const,
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    variant: 'outline' as const,
    color: 'text-gray-600 bg-gray-50 border-gray-200'
  },
  overdue: {
    label: 'Atrasada',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  // Contract statuses
  active: {
    label: 'Ativo',
    icon: CheckCircle,
    variant: 'success' as const,
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  inactive: {
    label: 'Inativo',
    icon: XCircle,
    variant: 'secondary' as const,
    color: 'text-gray-600 bg-gray-50 border-gray-200'
  },
  expired: {
    label: 'Expirado',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  expiring: {
    label: 'Expirando',
    icon: AlertCircle,
    variant: 'warning' as const,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  className
}) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge
      className={cn(
        config.color,
        sizeClasses[size],
        'inline-flex items-center gap-1.5 font-medium border',
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size])} />}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;