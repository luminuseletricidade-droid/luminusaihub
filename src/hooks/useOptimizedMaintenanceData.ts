import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceFilters {
  status?: string[];
  type?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  contractId?: string;
}

export const useOptimizedMaintenanceData = (filters: MaintenanceFilters = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Optimized maintenances query with selective fields
  const {
    data: maintenances = [],
    isLoading: maintenancesLoading,
    error: maintenancesError,
    refetch: refetchMaintenances
  } = useQuery({
    queryKey: ['maintenances', 'optimized', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('maintenances')
        .select(`
          id,
          contract_id,
          status,
          scheduled_date,
          scheduled_time,
          type,
          priority,
          description,
          notes,
          technician,
          estimated_duration,
          equipment_id,
          client_name,
          contract_number,
          created_at,
          updated_at,
          contracts!maintenances_contract_id_fkey(
            contract_number,
            client_name,
            clients!contracts_client_id_fkey(name)
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.type?.length) {
        query = query.in('type', filters.type);
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.contractId) {
        query = query.eq('contract_id', filters.contractId);
      }
      
      if (filters.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: unknown) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    }
  });

  // Transform maintenances with enhanced data
  const enrichedMaintenances = useMemo(() => {
    return maintenances.map(maintenance => {
      // Determine if maintenance is overdue
      const isOverdue = maintenance.status === 'scheduled' && 
        new Date(maintenance.scheduled_date) < new Date();

      // Map database status to frontend status
      let frontendStatus: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending';
      
      if (isOverdue) {
        frontendStatus = 'overdue';
      } else {
        switch (maintenance.status) {
          case 'scheduled':
            frontendStatus = 'pending';
            break;
          case 'in_progress':
            frontendStatus = 'in_progress';
            break;
          case 'completed':
            frontendStatus = 'completed';
            break;
          default:
            frontendStatus = 'pending';
        }
      }

      return {
        ...maintenance,
        frontend_status: frontendStatus,
        client_name: maintenance.client_name || 
          maintenance.contracts?.client_name || 
          maintenance.contracts?.clients?.name || 
          'Cliente não informado',
        contract_number: maintenance.contract_number || 
          maintenance.contracts?.contract_number || 
          'Não informado',
        is_overdue: isOverdue
      };
    });
  }, [maintenances]);

  // Calculate maintenance statistics
  const maintenanceStats = useMemo(() => {
    const total = enrichedMaintenances.length;
    const pending = enrichedMaintenances.filter(m => m.frontend_status === 'pending').length;
    const inProgress = enrichedMaintenances.filter(m => m.frontend_status === 'in_progress').length;
    const completed = enrichedMaintenances.filter(m => m.frontend_status === 'completed').length;
    const overdue = enrichedMaintenances.filter(m => m.frontend_status === 'overdue').length;
    
    // Calculate completion rate
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate upcoming maintenances (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = enrichedMaintenances.filter(m => {
      const scheduledDate = new Date(m.scheduled_date);
      return scheduledDate >= today && scheduledDate <= nextWeek && m.frontend_status === 'pending';
    }).length;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      upcoming,
      completionRate
    };
  }, [enrichedMaintenances]);

  // Update maintenance status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Map frontend status to database status
      const dbStatus = status === 'pending' ? 'scheduled' :
        status === 'in_progress' ? 'in_progress' :
        status === 'completed' ? 'completed' : 'scheduled';

      const updateData: unknown = { status: dbStatus };
      
      // If completing, add completion date
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('maintenances')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      
      const statusLabels = {
        pending: 'Pendente',
        in_progress: 'Em Andamento',
        completed: 'Concluída',
        overdue: 'Atrasada'
      };
      
      toast({
        title: "Status atualizado",
        description: `Manutenção marcada como: ${statusLabels[status as keyof typeof statusLabels]}`
      });
    },
    onError: (error) => {
      console.error('Error updating maintenance status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da manutenção.",
        variant: "destructive"
      });
    }
  });

  // Delete maintenance mutation
  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast({
        title: "Manutenção excluída",
        description: "A manutenção foi excluída com sucesso."
      });
    },
    onError: (error) => {
      console.error('Error deleting maintenance:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a manutenção.",
        variant: "destructive"
      });
    }
  });

  // Invalidate queries function
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  }, [queryClient]);

  return {
    // Data
    maintenances: enrichedMaintenances,
    stats: maintenanceStats,
    
    // Loading states
    isLoading: maintenancesLoading,
    
    // Errors
    error: maintenancesError,
    
    // Actions
    refetch: refetchMaintenances,
    invalidateQueries,
    updateStatus: updateStatusMutation.mutate,
    deleteMaintenance: deleteMaintenance.mutate,
    
    // Mutation states
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting: deleteMaintenance.isPending
  };
};

export default useOptimizedMaintenanceData;