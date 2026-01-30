
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuickStatusChangerProps {
  contractId: string;
  currentStatus: 'active' | 'inactive' | 'expired' | 'renewal';
  contractType: 'maintenance' | 'rental' | 'hybrid';
  onStatusChange: (newStatus: string, newType: string) => void;
}

const QuickStatusChanger = ({ contractId, currentStatus, contractType, onStatusChange }: QuickStatusChangerProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      expired: 'destructive',
      renewal: 'secondary'
    } as const;

    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      expired: 'Vencido',
      renewal: 'Renovação'
    };

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels = {
      maintenance: 'Manutenção',
      rental: 'Locação',
      hybrid: 'Híbrido'
    };

    return <Badge variant="outline">{labels[type as keyof typeof labels]}</Badge>;
  };

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: newStatus })
        .eq('id', contractId);

      if (error) throw error;

      onStatusChange(newStatus, contractType);
      toast({
        title: "Status atualizado",
        description: "O status do contrato foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateType = async (newType: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ contract_type: newType })
        .eq('id', contractId);

      if (error) throw error;

      onStatusChange(currentStatus, newType);
      toast({
        title: "Tipo atualizado",
        description: "O tipo do contrato foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating type:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o tipo.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={currentStatus} onValueChange={updateStatus} disabled={isUpdating}>
        <SelectTrigger className="w-auto border-none p-0 h-auto bg-transparent">
          <SelectValue asChild>
            {getStatusBadge(currentStatus)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border">
          <SelectItem value="active" className="bg-background hover:bg-accent">Ativo</SelectItem>
          <SelectItem value="inactive" className="bg-background hover:bg-accent">Inativo</SelectItem>
          <SelectItem value="expired" className="bg-background hover:bg-accent">Vencido</SelectItem>
          <SelectItem value="renewal" className="bg-background hover:bg-accent">Renovação</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={contractType} onValueChange={updateType} disabled={isUpdating}>
        <SelectTrigger className="w-auto border-none p-0 h-auto bg-transparent">
          <SelectValue asChild>
            {getTypeBadge(contractType)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border">
          <SelectItem value="maintenance" className="bg-background hover:bg-accent">Manutenção</SelectItem>
          <SelectItem value="rental" className="bg-background hover:bg-accent">Locação</SelectItem>
          <SelectItem value="hybrid" className="bg-background hover:bg-accent">Híbrido</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default QuickStatusChanger;
