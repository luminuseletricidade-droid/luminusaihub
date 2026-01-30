import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface ContractCardProps {
  contract: {
    id: string;
    contract_number: string;
    client_name: string;
    status: string;
    value?: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
  };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const ContractCard = memo(({ contract, onView, onEdit }: ContractCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'expired': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'expired': return 'Expirado';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const isExpiringSoon = () => {
    if (!contract.end_date) return false;
    const endDate = new Date(contract.end_date);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return endDate <= thirtyDaysFromNow && endDate > new Date();
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {contract.contract_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {contract.client_name}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={getStatusVariant(contract.status)}>
              {getStatusLabel(contract.status)}
            </Badge>
            {isExpiringSoon() && (
              <Badge variant="outline" className="border-orange-200 text-orange-700">
                Vence em breve
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {contract.value && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatCurrency(contract.value)}</span>
            </div>
          )}
          
          {contract.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(contract.start_date)}</span>
            </div>
          )}
        </div>

        {contract.end_date && (
          <div className="text-xs text-muted-foreground">
            Vence em: {formatDate(contract.end_date)}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(contract.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(contract.id)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ContractCard.displayName = 'ContractCard';

export default ContractCard;