import React from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Pause,
  Calendar,
  Settings,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaintenanceStatusButtonProps {
  status: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pill' | 'modern';
}

export default function MaintenanceStatusButton({ 
  status, 
  onClick, 
  className,
  size = 'md',
  variant = 'modern'
}: MaintenanceStatusButtonProps) {
  
  const getStatusConfig = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    const configs = {
      'pending': {
        label: 'Pendente',
        icon: Clock,
        colors: {
          bg: 'bg-slate-50 hover:bg-slate-100',
          border: 'border-slate-200 hover:border-slate-300',
          text: 'text-slate-700',
          icon: 'text-slate-500',
          gradient: 'from-slate-50 to-slate-100'
        }
      },
      'scheduled': {
        label: 'Agendado',
        icon: Calendar,
        colors: {
          bg: 'bg-blue-50 hover:bg-blue-100',
          border: 'border-blue-200 hover:border-blue-300',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          gradient: 'from-blue-50 to-blue-100'
        }
      },
      'in_progress': {
        label: 'Em Andamento',
        icon: Settings,
        colors: {
          bg: 'bg-orange-50 hover:bg-orange-100',
          border: 'border-orange-200 hover:border-orange-300',
          text: 'text-orange-800',
          icon: 'text-orange-600',
          gradient: 'from-orange-50 to-orange-100'
        }
      },
      'em_andamento': {
        label: 'Em Andamento',
        icon: Wrench,
        colors: {
          bg: 'bg-amber-50 hover:bg-amber-100',
          border: 'border-amber-200 hover:border-amber-300',
          text: 'text-amber-800',
          icon: 'text-amber-600',
          gradient: 'from-amber-50 to-amber-100'
        }
      },
      'completed': {
        label: 'Concluído',
        icon: CheckCircle2,
        colors: {
          bg: 'bg-green-50 hover:bg-green-100',
          border: 'border-green-200 hover:border-green-300',
          text: 'text-green-800',
          icon: 'text-green-600',
          gradient: 'from-green-50 to-green-100'
        }
      },
      'overdue': {
        label: 'Atrasado',
        icon: AlertTriangle,
        colors: {
          bg: 'bg-red-50 hover:bg-red-100',
          border: 'border-red-200 hover:border-red-300',
          text: 'text-red-800',
          icon: 'text-red-600',
          gradient: 'from-red-50 to-red-100'
        }
      },
      'cancelled': {
        label: 'Cancelado',
        icon: Pause,
        colors: {
          bg: 'bg-gray-50 hover:bg-gray-100',
          border: 'border-gray-200 hover:border-gray-300',
          text: 'text-gray-700',
          icon: 'text-gray-500',
          gradient: 'from-gray-50 to-gray-100'
        }
      }
    };

    // Mapeamento para diferentes variações do status
    if (statusLower.includes('andamento') || statusLower.includes('progress')) {
      return configs['in_progress'];
    }
    if (statusLower.includes('conclu') || statusLower.includes('complet') || statusLower.includes('finaliz')) {
      return configs['completed'];
    }
    if (statusLower.includes('agend') || statusLower.includes('schedul')) {
      return configs['scheduled'];
    }
    if (statusLower.includes('atras') || statusLower.includes('overdue')) {
      return configs['overdue'];
    }
    if (statusLower.includes('cancel')) {
      return configs['cancelled'];
    }
    if (statusLower.includes('pend')) {
      return configs['pending'];
    }

    return configs[statusLower] || configs['pending'];
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'h-8 px-3 text-sm',
      icon: 'w-3 h-3',
      gap: 'gap-1.5'
    },
    md: {
      container: 'h-10 px-4 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-2'
    },
    lg: {
      container: 'h-12 px-5 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2.5'
    }
  };

  const variantClasses = {
    default: cn(
      'inline-flex items-center justify-center rounded-lg border transition-all duration-200',
      'font-medium shadow-sm',
      config.colors.bg,
      config.colors.border,
      config.colors.text,
      sizeClasses[size].container,
      sizeClasses[size].gap
    ),
    pill: cn(
      'inline-flex items-center justify-center rounded-full border transition-all duration-200',
      'font-medium shadow-sm',
      config.colors.bg,
      config.colors.border,
      config.colors.text,
      sizeClasses[size].container,
      sizeClasses[size].gap
    ),
    modern: cn(
      'inline-flex items-center justify-center rounded-xl border transition-all duration-200',
      'font-medium shadow-sm bg-gradient-to-r backdrop-blur-sm',
      `bg-gradient-to-r ${config.colors.gradient}`,
      config.colors.border,
      config.colors.text,
      'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
      sizeClasses[size].container,
      sizeClasses[size].gap
    )
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        variantClasses[variant],
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default',
        className
      )}
    >
      <Icon className={cn(sizeClasses[size].icon, config.colors.icon)} />
      <span className="font-semibold">{config.label}</span>
      
      {/* Indicador de status animado para "Em Andamento" */}
      {(status?.toLowerCase().includes('andamento') || status?.toLowerCase().includes('progress')) && (
        <div className="ml-2 flex space-x-1">
          <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
      
      {/* Checkmark animado para "Concluído" */}
      {(status?.toLowerCase().includes('conclu') || status?.toLowerCase().includes('complet')) && (
        <div className="ml-1 w-2 h-2 bg-current rounded-full animate-ping"></div>
      )}
    </button>
  );
}

// Importar as funções de configuração de status
import { getSelectableStatuses } from '@/config/maintenanceStatus';

// Componente para dropdown de mudança de status
export function MaintenanceStatusDropdown({
  currentStatus,
  onStatusChange,
  className,
  size = 'md',
  scheduledDate,
  scheduledTime
}: {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  scheduledDate?: string;
  scheduledTime?: string;
}) {
  // Usar as regras de transição da configuração centralizada
  const selectableStatuses = getSelectableStatuses(currentStatus);

  const handleStatusChange = (newStatus: string) => {
    // Sem validações especiais - permitir todas as transições definidas na configuração
    onStatusChange(newStatus);
  };

  return (
    <div className="relative group">
      <MaintenanceStatusButton
        status={currentStatus}
        size={size}
        variant="modern"
        className={cn("group-hover:ring-2 ring-blue-200", className)}
      />

      {/* Dropdown menu */}
      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="p-1">
          {selectableStatuses.map((statusInfo) => {
            return (
              <button
                key={statusInfo.key}
                onClick={() => handleStatusChange(statusInfo.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors",
                  "hover:bg-gray-50"
                )}
              >
                <MaintenanceStatusButton
                  status={statusInfo.key}
                  size="sm"
                  variant="default"
                  className="w-full"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}