import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealtimeSyncProps {
  onDataUpdate: () => void;
  tables: string[];
  showNotifications?: boolean;
}

export const useRealtimeSync = ({ 
  onDataUpdate, 
  tables, 
  showNotifications = false 
}: RealtimeSyncProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const channels = tables.map(tableName => {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            console.log(`${tableName} change detected:`, payload);
            
            if (showNotifications) {
              switch (payload.eventType) {
                case 'INSERT':
                  toast({
                    title: "Dados Atualizados",
                    description: `Novo registro adicionado em ${tableName}`
                  });
                  break;
                case 'UPDATE':
                  toast({
                    title: "Dados Atualizados", 
                    description: `Registro atualizado em ${tableName}`
                  });
                  break;
                case 'DELETE':
                  toast({
                    title: "Dados Atualizados",
                    description: `Registro removido de ${tableName}`
                  });
                  break;
              }
            }
            
            onDataUpdate();
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [onDataUpdate, tables, showNotifications, toast]);

  return {
    syncData: onDataUpdate
  };
};