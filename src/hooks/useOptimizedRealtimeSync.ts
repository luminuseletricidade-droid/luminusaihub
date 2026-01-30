import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from './useDebounce';

interface OptimizedRealtimeSyncProps {
  tables: string[];
  showNotifications?: boolean;
  debounceMs?: number;
  contractId?: string;
  userId?: string;
}

export const useOptimizedRealtimeSync = ({ 
  tables, 
  showNotifications = false,
  debounceMs = 1000,
  contractId,
  userId
}: OptimizedRealtimeSyncProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef<number>(0);
  const channelsRef = useRef<unknown[]>([]);

  // Debounced invalidation to prevent excessive queries
  const debouncedInvalidate = useDebounce(
    useCallback((table: string) => {
      // Invalidate related queries based on table
      switch (table) {
        case 'contracts':
          queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-contracts', userId] });
          if (contractId) {
            queryClient.invalidateQueries({ queryKey: ['contract-details', contractId] });
          }
          break;
        case 'maintenances':
          queryClient.invalidateQueries({ queryKey: ['maintenances', userId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-maintenances', userId] });
          break;
        case 'clients':
          queryClient.invalidateQueries({ queryKey: ['clients', userId] });
          break;
        case 'equipment':
          queryClient.invalidateQueries({ queryKey: ['equipment', contractId] });
          break;
        case 'contract_services':
          queryClient.invalidateQueries({ queryKey: ['contract-services', contractId] });
          break;
        default:
          // Fallback: invalidate all queries for the user
          queryClient.invalidateQueries({ queryKey: [table, userId] });
      }
    }, [queryClient, userId, contractId]),
    debounceMs
  );

  useEffect(() => {
    if (!userId) return;

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    const channels = tables.map(tableName => {
      const channelName = contractId 
        ? `${tableName}-${contractId}-${userId}`
        : `${tableName}-${userId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: contractId ? `contract_id=eq.${contractId}` : `user_id=eq.${userId}`
          },
          (payload) => {
            const now = Date.now();
            
            // Throttle rapid updates
            if (now - lastUpdateRef.current < 500) {
              return;
            }
            
            lastUpdateRef.current = now;
            
            console.log(`📡 Optimized ${tableName} change:`, payload.eventType, (payload.new as unknown)?.id);
            
            // Show notifications if enabled
            if (showNotifications) {
              const eventMessages = {
                INSERT: `Novo registro em ${tableName}`,
                UPDATE: `Registro atualizado em ${tableName}`,
                DELETE: `Registro removido de ${tableName}`
              };
              
              toast({
                title: "Dados Atualizados",
                description: eventMessages[payload.eventType] || `Mudança em ${tableName}`,
                duration: 2000
              });
            }
            
            // Trigger debounced invalidation
            debouncedInvalidate(tableName);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${tableName} changes`);
          }
        });

      return channel;
    });

    channelsRef.current = channels;

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [tables, contractId, userId, showNotifications, debouncedInvalidate, toast]);

  // Manual sync function
  const syncData = useCallback(() => {
    tables.forEach(table => {
      debouncedInvalidate(table);
    });
  }, [tables, debouncedInvalidate]);

  return {
    syncData
  };
};