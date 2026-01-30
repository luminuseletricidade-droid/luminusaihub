import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para sincronização automática do status de manutenções
 * Atualiza automaticamente manutenções com datas passadas para "atrasado"
 */
export const useMaintenanceStatusSync = () => {
  const { toast } = useToast();

  // Método fallback caso a função SQL não funcione
  const updateOverdueMaintenancesFallback = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Atualizar manutenções atrasadas diretamente usando o campo status
      const { data: updatedMaintenances, error } = await supabase
        .from('maintenances')
        .update({
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .lt('scheduled_date', today)
        .in('status', ['scheduled', 'pending']) // Apenas atualizar se estiver agendado ou pendente
        .select('id');

      if (error) {
        console.error('❌ Erro no método fallback:', error);
        return 0;
      }

      const count = updatedMaintenances?.length || 0;
      if (count > 0) {
        console.log(`✅ Fallback: ${count} manutenções atualizadas para "overdue"`);
      }

      return count;
    } catch (error) {
      console.error('❌ Erro no método fallback:', error);
      return 0;
    }
  }, []);

  const updateOverdueMaintenances = useCallback(async () => {
    try {
      console.log('🔄 Executando sincronização automática de manutenções atrasadas...');
      
      // A função SQL ainda não foi criada no banco, usando apenas fallback
      // TODO: Criar a função update_overdue_maintenances no Supabase usando a migration 20240331_create_update_overdue_function.sql
      
      // Por enquanto, usar apenas o fallback
      const updatedCount = await updateOverdueMaintenancesFallback();
      
      if (updatedCount > 0) {
        console.log(`✅ ${updatedCount} manutenções atualizadas automaticamente para "atrasado"`);
        
        // Notificar usuário sobre manutenções atrasadas (apenas se houver muitas)
        if (updatedCount > 3) {
          toast({
            title: "Manutenções Atrasadas",
            description: `${updatedCount} manutenções foram marcadas como atrasadas automaticamente`,
            variant: "default"
          });
        }
      } else {
        console.log('✅ Nenhuma manutenção atrasada encontrada');
      }

      return updatedCount;
    } catch (error) {
      console.error('❌ Erro na sincronização de status:', error);
    }
  }, [toast, updateOverdueMaintenancesFallback]);

  const scheduleStatusCheck = useCallback(() => {
    // Executar imediatamente
    updateOverdueMaintenances();

    // Agendar verificação a cada 5 minutos
    const interval = setInterval(updateOverdueMaintenances, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateOverdueMaintenances]);

  // Auto-executar quando o hook for montado
  useEffect(() => {
    // Evitar execução dupla no StrictMode do React
    let mounted = true;
    
    if (mounted) {
      const cleanup = scheduleStatusCheck();
      return () => {
        mounted = false;
        cleanup();
      };
    }
  }, [scheduleStatusCheck]);

  return {
    updateOverdueMaintenances,
    scheduleStatusCheck
  };
};

export default useMaintenanceStatusSync;