import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  DollarSign,
  FileText,
  CheckCircle,
  Eye,
  MoreVertical,
  Archive,
  Trash2,
  AlertTriangle,
  Clock,
  Wrench,
  MessageSquare
} from 'lucide-react';
import QuickStatusChanger from './QuickStatusChanger';
import { useState } from 'react';
import { ExtendedContract } from '@/types';
import { formatDateSafe } from '@/utils/formatters';

interface ContractCardProps {
  contract: ExtendedContract;
  onSelect: (contract: ExtendedContract) => void;
  getContractAlerts: (contract: ExtendedContract) => string[];
  onStatusChange: (contractId: string, newStatus: string, newType: string) => void;
  onArchiveContract?: (contractId: string) => void;
  onDeleteContract?: (contractId: string) => void;
  onOpenChat?: (contract: ExtendedContract) => void;
}

const ContractCard = ({ 
  contract, 
  onSelect, 
  getContractAlerts, 
  onStatusChange,
  onArchiveContract,
  onDeleteContract,
  onOpenChat
}: ContractCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const alerts = getContractAlerts(contract);
  const monthlyValue = (contract.value || contract.contract_value || 0) / 12;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return formatDateSafe(dateString);
  };

  const getOperationalStatusIcon = (status?: ExtendedContract['operational_status']) => {
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

  const getOperationalStatusText = (status?: ExtendedContract['operational_status']) => {
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

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
        alerts.some(a => a.includes('Vence')) ? 'border-l-yellow-500' : 
        alerts.some(a => a.includes('Vencido')) ? 'border-l-red-500' :
        'border-l-green-500'
      }`}
      onClick={() => onSelect(contract)}
    >
      <CardContent className="p-4">
        {/* Contract Info and Client */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-base font-semibold">{contract.contract_number}</h4>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{contract.client_name}</span>
              {contract.clients?.phone && (
                <span className="ml-2">• Tel: {contract.clients.phone}</span>
              )}
              {contract.clients?.contact_person && (
                <span className="ml-2">• {contract.clients.contact_person}</span>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            <div>{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</div>
            {contract.clients?.emergency_contact && (
              <div className="text-xs text-red-600 font-medium">
                🚨 {contract.clients.emergency_contact}
              </div>
            )}
          </div>
        </div>

        {/* Status and Type */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {contract.contract_type === 'maintenance' ? 'Manutenção' : 
               contract.contract_type === 'rental' ? 'Locação' : 'Híbrido'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <QuickStatusChanger
              contractId={contract.id}
              currentStatus={contract.status === 'draft' ? 'active' : contract.status}
              contractType={contract.contract_type}
              onStatusChange={(newStatus, newType) => onStatusChange(contract.id, newStatus, newType)}
            />
          </div>
        </div>

        {/* Operational Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3 text-primary" />
              <span className="font-medium">{formatCurrency(monthlyValue)}/mês</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3 text-primary" />
              <span>{contract.equipment?.type || contract.equipment_type || 'Não informado'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-primary" />
              <span>{contract.maintenance_count || 0} OSs</span>
            </div>
            <div className="flex items-center space-x-1">
              {getOperationalStatusIcon(contract.operational_status)}
              <span>{getOperationalStatusText(contract.operational_status)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(contract);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            
            {onOpenChat && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChat(contract);
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Chat IA
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onArchiveContract && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveContract(contract.id);
                    }}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDeleteContract && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato {contract.contract_number}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteContract) {
                  onDeleteContract(contract.id);
                }
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ContractCard;