import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  // Prefetch contract details
  const prefetchContract = useCallback(async (contractId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['contract', contractId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            *,
            clients!contracts_client_id_fkey(*),
            equipment!equipment_contract_id_fkey(*),
            contract_services!contract_services_contract_id_fkey(*),
            maintenances!maintenances_contract_id_fkey(*)
          `)
          .eq('id', contractId)
          .single();
        
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  // Prefetch maintenance details
  const prefetchMaintenance = useCallback(async (maintenanceId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['maintenance', maintenanceId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('maintenances')
          .select(`
            *,
            contracts!maintenances_contract_id_fkey(
              contract_number,
              client_name,
              clients!contracts_client_id_fkey(*)
            ),
            equipment!maintenances_equipment_id_fkey(*)
          `)
          .eq('id', maintenanceId)
          .single();
        
        if (error) throw error;
        return data;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
    });
  }, [queryClient]);

  // Prefetch client contracts
  const prefetchClientContracts = useCallback(async (clientId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['contracts', 'by-client', clientId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            contract_number,
            contract_type,
            status,
            value,
            start_date,
            end_date
          `)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [queryClient]);

  // Prefetch related maintenances
  const prefetchContractMaintenances = useCallback(async (contractId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['maintenances', 'by-contract', contractId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('maintenances')
          .select(`
            id,
            status,
            scheduled_date,
            type,
            priority,
            technician
          `)
          .eq('contract_id', contractId)
          .order('scheduled_date', { ascending: true });
        
        if (error) throw error;
        return data || [];
      },
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  }, [queryClient]);

  return {
    prefetchContract,
    prefetchMaintenance,
    prefetchClientContracts,
    prefetchContractMaintenances
  };
};

export default usePrefetch;