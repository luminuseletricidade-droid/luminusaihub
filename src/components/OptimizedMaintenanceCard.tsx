import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface MaintenanceCardProps {
  maintenance: {
    id: string;
    type: string;
    status: string;
    scheduled_date: string;
    priority: string;
    client_name: string;
    contract_number: string;
  };
  onStatusChange: (id: string, status: string) => void;
  onView: (id: string) => void;
}

const MaintenanceCard = memo(({ maintenance, onStatusChange, onView }: MaintenanceCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'outline';
      case 'scheduled': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'in_progress': return 'Em Progresso';
      case 'scheduled': return 'Agendada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'preventiva': return 'Preventiva';
      case 'corretiva': return 'Corretiva';
      case 'preditiva': return 'Preditiva';
      default: return type;
    }
  };

  const isOverdue = () => {
    return new Date(maintenance.scheduled_date) < new Date() && 
           maintenance.status === 'scheduled';
  };

  const getStatusIcon = () => {
    switch (maintenance.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'scheduled':
        return isOverdue() ? 
          <AlertCircle className="h-4 w-4 text-red-600" /> :
          <Calendar className="h-4 w-4 text-gray-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${
      isOverdue() ? 'border-red-200 bg-red-50/50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {getStatusIcon()}
              {maintenance.contract_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {maintenance.client_name}
            </p>
          </div>
          <div className="flex gap-2 flex-col items-end">
            <Badge variant={getStatusColor(maintenance.status)}>
              {getStatusLabel(maintenance.status)}
            </Badge>
            <Badge variant={getPriorityColor(maintenance.priority)}>
              {getTypeLabel(maintenance.type)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(maintenance.scheduled_date)}</span>
          {isOverdue() && (
            <Badge variant="destructive" className="text-xs">
              Atrasada
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(maintenance.id)}
            className="flex-1"
          >
            Ver Detalhes
          </Button>
          
          {maintenance.status === 'scheduled' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(maintenance.id, 'in_progress')}
              className="flex-1"
            >
              Iniciar
            </Button>
          )}
          
          {maintenance.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(maintenance.id, 'completed')}
              className="flex-1"
            >
              Concluir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

MaintenanceCard.displayName = 'MaintenanceCard';

export default MaintenanceCard;