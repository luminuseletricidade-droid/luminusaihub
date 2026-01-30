import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toastManager';

interface MaintenanceSyncProps {
  onMaintenanceUpdate: () => void;
}

export const useMaintenanceSync = ({ onMaintenanceUpdate }: MaintenanceSyncProps) => {

  useEffect(() => {
    // Configurar real-time updates para manutenções
    const channel = supabase
      .channel('maintenances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenances'
        },
        (payload) => {
          console.log('Maintenance change detected:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              toast({
                title: "Nova Manutenção",
                description: "Uma nova manutenção foi criada"
              });
              break;
            case 'UPDATE':
              toast({
                title: "Manutenção Atualizada",
                description: "Uma manutenção foi modificada"
              });
              break;
            case 'DELETE':
              toast({
                title: "Manutenção Removida",
                description: "Uma manutenção foi excluída"
              });
              break;
          }
          
          onMaintenanceUpdate();
        }
      )
      .subscribe();

    // Configurar updates para documentos de manutenção
    const documentsChannel = supabase
      .channel('maintenance-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_documents'
        },
        (payload) => {
          console.log('Maintenance document change detected:', payload);
          onMaintenanceUpdate();
        }
      )
      .subscribe();

    // Configurar updates para checklists
    const checklistsChannel = supabase
      .channel('maintenance-checklists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_checklists'
        },
        (payload) => {
          console.log('Maintenance checklist change detected:', payload);
          onMaintenanceUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(checklistsChannel);
    };
  }, [onMaintenanceUpdate]);

  const syncMaintenanceData = async (maintenanceId: string) => {
    try {
      // Recarregar dados da manutenção
      onMaintenanceUpdate();
      
      toast({
        title: "Dados Sincronizados",
        description: "Dados da manutenção foram atualizados"
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na Sincronização",
        description: "Falha ao sincronizar dados",
        variant: "destructive"
      });
    }
  };

  return {
    syncMaintenanceData
  };
};