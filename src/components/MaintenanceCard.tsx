import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Edit,
  MoreVertical,
  Camera,
  FileText
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MaintenanceEditDialog from './MaintenanceEditDialog';
import MaintenanceChecklist from './MaintenanceChecklist';
import { translateStatus, translatePriority, translateType } from '@/utils/translations';
import MediaUpload from './MediaUpload';
import MaintenanceStatusButton, { MaintenanceStatusDropdown } from './MaintenanceStatusButton';
import { getMaintenanceStatusInfo, isMaintenanceOverdue } from '@/config/maintenanceStatus';

interface MaintenanceCardProps {
  maintenance: unknown;
  onUpdate: (updated: unknown) => void;
  onStatusChange: (id: string, status: string) => void;
}

export default function MaintenanceCard({ maintenance, onUpdate, onStatusChange }: MaintenanceCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Usar funções centralizadas do config
  const statusInfo = getMaintenanceStatusInfo(maintenance.status);
  const isOverdueStatus = isMaintenanceOverdue(maintenance.scheduled_date, maintenance.status);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Manutenção Preventiva 250h': '#10b981',
      'Manutenção Preventiva 500h': '#059669',
      'Manutenção Mensal': '#14b8a6',
      'Manutenção Corretiva': '#f59e0b',
      'Atendimento Emergencial': '#ef4444',
      'Teste de Carga / Operação Assistida de Partida': '#8b5cf6',
      'Startup / Comissionamento': '#6366f1',
      'Avarias de Controlador': '#dc2626',
      'Visita Técnica Orçamentária': '#0ea5e9',
      'Visita Técnica de Inspeção': '#06b6d4',
      'Inspeção de Alternador': '#3b82f6',
      'Limpeza de Radiador': '#22c55e',
      'Instalação de Equipamentos': '#a855f7',
      'Instalação de GMG – Próprio (permanente)': '#7c3aed',
      'Limpeza de Tanque': '#84cc16',
      'Troca de Bateria': '#eab308',
      'Manutenção Mensal (complementar)': '#0d9488',
      'Regulagem de Válvulas': '#f97316',
      'Revisão/Calibração de Bomba Injetora': '#ec4899',
      'Entrega/Retirada de GMG': '#64748b'
    };
    return colors[type] || '#6b7280';
  };

  const StatusIcon = statusInfo.icon;

  const getTypeLabel = (type: string) => {
    return translateType(type);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'critical': '#dc2626'
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  };

  const getPriorityLabel = (priority: string) => {
    return translatePriority(priority);
  };

  const isToday = maintenance.scheduled_date && new Date(maintenance.scheduled_date).toDateString() === new Date().toDateString();
  const isUpcoming = maintenance.scheduled_date && new Date(maintenance.scheduled_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <>
      <Card
        className={`hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
          isOverdueStatus ? 'border-red-500 border-2' :
          isToday ? 'border-orange-500 border-2' :
          isUpcoming ? 'border-yellow-500' : ''
        }`}
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              {/* Badges de Status e Tipo */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Indicador de ATRASADO - destaque especial */}
                {isOverdueStatus && (
                  <Badge
                    className="flex items-center gap-1 animate-pulse bg-red-100 text-red-800 border-red-300"
                    variant="outline"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    ATRASADO
                  </Badge>
                )}
                
                <MaintenanceStatusDropdown
                  currentStatus={maintenance.status}
                  onStatusChange={(newStatus) => onStatusChange(maintenance.id, newStatus)}
                  size="md"
                  scheduledDate={maintenance.scheduled_date}
                  scheduledTime={maintenance.scheduled_time}
                />
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: getTypeColor(maintenance.type),
                    color: getTypeColor(maintenance.type)
                  }}
                >
                  {getTypeLabel(maintenance.type)}
                </Badge>
                {maintenance.priority && (
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: getPriorityColor(maintenance.priority),
                      color: getPriorityColor(maintenance.priority)
                    }}
                  >
                    {getPriorityLabel(maintenance.priority)}
                  </Badge>
                )}
              </div>

              {/* Alertas */}
              {isOverdueStatus && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Manutenção em atraso!</span>
                </div>
              )}
              {isToday && !isOverdueStatus && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Agendada para hoje</span>
                </div>
              )}
              {isUpcoming && !isToday && !isOverdueStatus && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Se aproximando</span>
                </div>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Menu de ações rápidas
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informações principais */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {maintenance.client_name || 'Cliente não informado'}
            </h3>
            <p className="text-muted-foreground">
              {maintenance.description || 'Sem descrição'}
            </p>
          </div>

          <Separator />

          {/* Detalhes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {maintenance.scheduled_date 
                    ? formatDate(maintenance.scheduled_date)
                    : 'Data não definida'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {maintenance.scheduled_time || 'Horário não definido'}
                  {maintenance.end_time && ` - ${maintenance.end_time}`}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{maintenance.technician || 'Técnico não definido'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{maintenance.contract_number || 'Contrato não informado'}</span>
              </div>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="flex items-center gap-2 pt-2">
            <MaintenanceEditDialog maintenance={maintenance} onUpdate={onUpdate}>
              <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </MaintenanceEditDialog>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Abrir modal de checklist
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Checklist
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Abrir modal de upload
              }}
            >
              <Camera className="h-4 w-4 mr-1" />
              Mídia
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes completos */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Manutenção - {maintenance.client_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Informações principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Informações Gerais</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Cliente:</strong> {maintenance.client_name}</div>
                  <div><strong>Contrato:</strong> {maintenance.contract_number}</div>
                  <div><strong>Tipo:</strong> {getTypeLabel(maintenance.type)}</div>
                  <div><strong>Status:</strong> {statusInfo.label}</div>
                  <div><strong>Prioridade:</strong> {getPriorityLabel(maintenance.priority)}</div>
                  <div><strong>Técnico:</strong> {maintenance.technician}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Cronograma</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Data:</strong> {maintenance.scheduled_date ? formatDate(maintenance.scheduled_date) : 'Não definida'}</div>
                  <div><strong>Horário Início:</strong> {maintenance.scheduled_time || 'Não definido'}</div>
                  {maintenance.end_time && <div><strong>Horário Fim:</strong> {maintenance.end_time}</div>}
                  <div><strong>Duração estimada:</strong> {maintenance.estimated_duration ? `${maintenance.estimated_duration} min` : 'Não definida'}</div>
                  <div><strong>Frequência:</strong> {maintenance.frequency || 'Única'}</div>
                </div>
              </div>
            </div>

            {/* Descrição */}
            {maintenance.description && (
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {maintenance.description}
                </p>
              </div>
            )}

            {/* Observações */}
            {maintenance.notes && (
              <div>
                <h4 className="font-semibold mb-2">Observações</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {maintenance.notes}
                </p>
              </div>
            )}

            {/* Checklist */}
            <div>
              <h4 className="font-semibold mb-2">Checklist de Manutenção</h4>
              <MaintenanceChecklist
                maintenanceId={maintenance.id}
                maintenanceStatus={maintenance.status}
              />
            </div>

            {/* Upload de mídia */}
            <div>
              <h4 className="font-semibold mb-2">Documentos e Mídia</h4>
              <MediaUpload 
                maintenanceId={maintenance.id}
                onUploadComplete={() => {
                  // Refresh maintenance data
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}