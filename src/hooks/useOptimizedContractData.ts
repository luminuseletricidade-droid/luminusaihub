import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export const useOptimizedContractData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Optimized contract fetching with caching
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts
  } = useQuery({
    queryKey: ['contracts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          client_name,
          status,
          value,
          start_date,
          end_date,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Optimized clients fetching
  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError
  } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, created_at')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Optimized maintenances fetching
  const {
    data: maintenances = [],
    isLoading: maintenancesLoading,
    error: maintenancesError
  } = useQuery({
    queryKey: ['maintenances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('maintenances')
        .select(`
          id,
          contract_id,
          type,
          status,
          scheduled_date,
          priority,
          client_name,
          contract_number,
          created_at
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Invalidate specific data
  const invalidateContracts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contracts', user?.id] });
  }, [queryClient, user?.id]);

  const invalidateClients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clients', user?.id] });
  }, [queryClient, user?.id]);

  const invalidateMaintenances = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['maintenances', user?.id] });
  }, [queryClient, user?.id]);

  // Prefetch related data
  const prefetchContractDetails = useCallback(async (contractId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['contract-details', contractId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            *,
            clients(*),
            equipment(*),
            contract_services(*),
            maintenances(*)
          `)
          .eq('id', contractId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return {
    // Data
    contracts,
    clients,
    maintenances,
    
    // Loading states
    contractsLoading,
    clientsLoading,
    maintenancesLoading,
    isLoading: contractsLoading || clientsLoading || maintenancesLoading,
    
    // Errors
    contractsError,
    clientsError,
    maintenancesError,
    
    // Actions
    refetchContracts,
    invalidateContracts,
    invalidateClients,
    invalidateMaintenances,
    prefetchContractDetails,
  };
};