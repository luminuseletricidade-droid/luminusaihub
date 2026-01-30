
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContractService {
  id: string;
  contract_id: string;
  service_name: string;
  description: string | null;
  frequency: string;
  duration: number;
  created_at: string;
  updated_at: string;
}

export const useContractServices = (contractId?: string) => {
  const [services, setServices] = useState<ContractService[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchServices = useCallback(async () => {
    if (!user || !contractId) return;

    setLoading(true);
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

  const createService = async (serviceData: Omit<ContractService, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('contract_services')
        .insert({
          ...serviceData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Serviço Criado",
        description: `Serviço "${serviceData.service_name}" criado com frequência ${serviceData.frequency}`
      });

      fetchServices(); // Refresh list
      return data;
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar serviço",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    fetchServices,
    createService,
    refreshServices: fetchServices
  };
};
