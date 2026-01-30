import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useAuth } from '@/contexts/AuthContext';

interface ContractFilters {
  status?: string[];
  contract_type?: string[];
  operational_status?: string[];
  dateFrom?: string;
  dateTo?: string;
  valueFrom?: string;
  valueTo?: string;
  sortBy?: string;
}

export const useOptimizedContractQueries = (filters: ContractFilters = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createAbortController } = useMemoryCleanup();
  const { user } = useAuth();

  // Optimized contracts query with selective fields
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts
  } = useQuery({
    queryKey: ['contracts', 'optimized', filters, user?.id],
    queryFn: async ({ signal }) => {
      const abortController = createAbortController();

      if (!user?.id) {
        return [];
      }

      try {
        let query = supabase
          .from('contracts')
          .select(`
            id,
            contract_number,
            client_id,
            client_name,
            contract_type,
            start_date,
            end_date,
            value,
            status,
            equipment_type,
            equipment_model,
            equipment_location,
            created_at,
            updated_at,
            description,
            clients!contracts_client_id_fkey(
              id,
              name,
              phone,
              contact_person
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Apply filters efficiently
        if (filters.status?.length) {
          query = query.in('status', filters.status);
        }
        
        if (filters.contract_type?.length) {
          query = query.in('contract_type', filters.contract_type);
        }

        if (filters.dateFrom) {
          query = query.gte('start_date', filters.dateFrom);
        }
        
        if (filters.dateTo) {
          query = query.lte('end_date', filters.dateTo);
        }

        const { data, error } = await query.abortSignal(abortController.signal);
        
        if (error) throw error;
        
        return data || [];
      } catch (error) {
        if (!abortController.signal.aborted) {
          throw error;
        }
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: unknown) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    }
  });

  // Optimized maintenances query
  const {
    data: maintenances = [],
    isLoading: maintenancesLoading,
    error: maintenancesError
  } = useQuery({
    queryKey: ['maintenances', 'by-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenances')
        .select(`
          id,
          contract_id,
          status,
          scheduled_date,
          type,
          priority
        `)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    enabled: contracts.length > 0
  });

  // Transform and enrich contracts with maintenance data
  const enrichedContracts = useMemo(() => {
    return contracts.map(contract => {
      const contractMaintenances = maintenances.filter(m => m.contract_id === contract.id);
      
      // Calculate operational status
      const pendingMaintenances = contractMaintenances.filter(m => m.status === 'scheduled');
      const overdueMaintenances = contractMaintenances.filter(m => 
        m.status === 'scheduled' && new Date(m.scheduled_date) < new Date()
      );
      
      let operational_status: 'on_schedule' | 'delayed' | 'pending' = 'on_schedule';
      if (overdueMaintenances.length > 0) {
        operational_status = 'delayed';
      } else if (pendingMaintenances.length > 0) {
        operational_status = 'pending';
      }

      // Get alerts
      const alerts: string[] = [];
      if (overdueMaintenances.length > 0) {
        alerts.push('Manutenção em atraso');
      }
      
      // Check contract expiry
      if (contract.end_date) {
        const endDate = new Date(contract.end_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          alerts.push(`Vence em ${daysUntilExpiry} dias`);
        } else if (daysUntilExpiry <= 0) {
          alerts.push('Vencido');
        }
      }

      return {
        ...contract,
        maintenance_count: contractMaintenances.length,
        operational_status,
        alerts,
        client: Array.isArray(contract.clients) ? contract.clients[0] : contract.clients
      };
    });
  }, [contracts, maintenances]);

  // Filtered and sorted contracts
  const filteredContracts = useMemo(() => {
    let filtered = enrichedContracts;

    // Apply value filters
    if (filters.valueFrom || filters.valueTo) {
      filtered = filtered.filter(contract => {
        const value = contract.value || 0;
        if (filters.valueFrom && value < parseFloat(filters.valueFrom)) return false;
        if (filters.valueTo && value > parseFloat(filters.valueTo)) return false;
        return true;
      });
    }

    // Apply operational status filter
    if (filters.operational_status?.length) {
      filtered = filtered.filter(contract => 
        filters.operational_status!.includes(contract.operational_status)
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'recent':
        return filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'oldest':
        return filtered.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'expiring':
        return filtered.sort((a, b) => {
          const aExpiry = a.end_date ? new Date(a.end_date).getTime() : Infinity;
          const bExpiry = b.end_date ? new Date(b.end_date).getTime() : Infinity;
          return aExpiry - bExpiry;
        });
      case 'value_high':
        return filtered.sort((a, b) => (b.value || 0) - (a.value || 0));
      case 'value_low':
        return filtered.sort((a, b) => (a.value || 0) - (b.value || 0));
      default:
        return filtered;
    }
  }, [enrichedContracts, filters]);

  // Archive contract mutation
  const archiveContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'inactive' })
        .eq('id', contractId);
      
      if (error) throw error;
      return contractId;
    },
    onSuccess: (contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "Contrato arquivado",
        description: "O contrato foi arquivado com sucesso."
      });
    },
    onError: (error) => {
      console.error('Error archiving contract:', error);
      toast({
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar o contrato.",
        variant: "destructive"
      });
    }
  });

  // Delete contract mutation
  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (error) throw error;
      return contractId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: "Contrato excluído",
        description: "O contrato foi excluído permanentemente."
      });
    },
    onError: (error) => {
      console.error('Error deleting contract:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive"
      });
    }
  });

  // Invalidate queries function
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
  }, [queryClient]);

  return {
    // Data
    contracts: filteredContracts,
    allContracts: enrichedContracts,
    maintenances,
    
    // Loading states
    isLoading: contractsLoading || maintenancesLoading,
    contractsLoading,
    maintenancesLoading,
    
    // Errors
    error: contractsError || maintenancesError,
    contractsError,
    maintenancesError,
    
    // Actions
    refetchContracts,
    invalidateQueries,
    archiveContract: archiveContractMutation.mutate,
    deleteContract: deleteContractMutation.mutate,
    
    // Mutation states
    isArchiving: archiveContractMutation.isPending,
    isDeleting: deleteContractMutation.isPending
  };
};

export default useOptimizedContractQueries;