
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EditableServiceCard } from './EditableServiceCard';

interface ContractService {
  id: string;
  service_name: string;
  description: string | null;
  frequency: string;
  duration: number;
  created_at: string;
}

interface ContractServicesListProps {
  contractId: string;
  refreshTrigger?: number;
}

export const ContractServicesList = ({ contractId, refreshTrigger }: ContractServicesListProps) => {
  const [services, setServices] = useState<ContractService[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchServices = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contract_services')
        .select('*')
        .eq('contract_id', contractId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar serviços",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, contractId, toast]);

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Isso também removerá todas as manutenções relacionadas.')) {
      return;
    }

    try {
      // Primeiro, deletar as manutenções relacionadas
      await supabase
        .from('maintenances')
        .delete()
        .eq('service_id', serviceId);

      // Depois, deletar o serviço
      const { error } = await supabase
        .from('contract_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Serviço Excluído",
        description: "Serviço e manutenções relacionadas foram removidos"
      });

      fetchServices();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir serviço",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices, refreshTrigger]);

  if (loading) {
    return <div className="text-center py-4">Carregando serviços...</div>;
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum serviço cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <EditableServiceCard
          key={service.id}
          service={service}
          onUpdate={fetchServices}
          onDelete={handleDeleteService}
        />
      ))}
    </div>
  );
};
