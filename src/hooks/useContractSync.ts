
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContractSyncData {
  id: string;
  contract_number: string;
  client_name: string;
  client_id?: string;
  contract_type: string; // Changed from union type to string to match database
  start_date: string;
  end_date: string;
  value: number;
  status: string;
  equipment_type: string;
  equipment_model: string;
  equipment_location: string;
  client_legal_name?: string | null;
  client_cnpj?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  client_zip_code?: string | null;
  client_contact_person?: string | null;
  payment_terms?: string | null;
  technical_notes?: string | null;
  special_conditions?: string | null;
  warranty_terms?: string | null;
  observations?: string | null;
  notes?: string | null;
  extracted_text?: string | null;
  maintenance_frequency?: string | null;
  equipment_brand?: string | null;
  equipment_serial?: string | null;
  equipment_condition?: string | null;
  equipment_year?: string | null;
  equipment_power?: string | null;
  equipment_voltage?: string | null;
  services?: unknown;
  description?: string;
  contract_documents?: Array<{
    id: string;
    document_name?: string | null;
    document_type?: string | null;
    file_path: string;
    file_name?: string | null;
    file_size?: number | null;
    content_extracted?: string | null;
    description?: string | null;
    metadata?: unknown;
    category?: string | null;
    created_at: string;
  }>;
  generated_reports?: Array<{
    id: string;
    agent_type?: string | null;
    title?: string | null;
    content?: string | null;
    metadata?: unknown;
    created_at: string;
  }>;
  clients?: {
    id: string;
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    secondary_phone?: string;
    contact_person?: string;
    website?: string;
    emergency_contact?: string;
    address?: string;
    notes?: string;
  } | null;
  equipment?: Array<{
    id: string;
    type: string;
    model: string;
    location: string;
    manufacturer?: string | null;
    serial_number?: string | null;
    quantity?: number | null;
    installation_date?: string | null;
    observations?: string | null;
  }>;
  contract_services?: Array<{
    id: string;
    service_name: string;
    description?: string;
    frequency: string;
    duration: number;
  }>;
  maintenances?: Array<{
    id: string;
    status: string;
    scheduled_date: string;
  }>;
}

export const useContractSync = (contractId: string) => {
  const [contractData, setContractData] = useState<ContractSyncData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchContractData = useCallback(async () => {
    if (!contractId) return;

    try {
      console.log('🔄 Sincronizando dados do contrato:', contractId);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!contracts_client_id_fkey(id, name, cnpj, email, phone, secondary_phone, contact_person, website, emergency_contact, address, notes),
          equipment!equipment_contract_id_fkey(id, type, model, location, manufacturer, serial_number, quantity, installation_date, observations),
          contract_services!contract_services_contract_id_fkey(id, service_name, description, frequency, duration),
          maintenances!maintenances_contract_id_fkey(id, status, scheduled_date),
          contract_documents!contract_documents_contract_id_fkey(id, document_name, document_type, file_path, file_name, file_size, content_extracted, description, metadata, category, created_at),
          generated_reports!generated_reports_contract_id_fkey(id, agent_type, title, content, metadata, created_at)
        `)
        .eq('id', contractId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao sincronizar contrato:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Dados sincronizados:', data);
        // Type assertion to handle the data properly
        const syncData: ContractSyncData = {
          ...data,
          equipment: Array.isArray(data.equipment) ? data.equipment : [],
          contract_services: Array.isArray(data.contract_services) ? data.contract_services : [],
          maintenances: Array.isArray(data.maintenances) ? data.maintenances : [],
          contract_documents: Array.isArray(data.contract_documents) ? data.contract_documents : [],
          generated_reports: Array.isArray(data.generated_reports) ? data.generated_reports : []
        };
        setContractData(syncData);
      }
    } catch (error) {
      console.error('💥 Erro na sincronização:', error);
      toast({
        title: "❌ Erro de Sincronização",
        description: "Não foi possível sincronizar os dados do contrato.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractId, toast]);

  // Setup real-time subscription with immediate context update
  useEffect(() => {
    if (!contractId) return;

    // Initial fetch
    fetchContractData();

    // Setup realtime channels with instant updates
    const contractChannel = supabase
      .channel(`contract-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `id=eq.${contractId}`
        },
        (payload) => {
          console.log('📡 Contract updated - INSTANT UPDATE:', payload);
          // Immediate fetch without debounce for instant context
          fetchContractData();
        }
      )
      .subscribe();

    const clientsChannel = supabase
      .channel(`clients-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          console.log('📡 Client updated - INSTANT UPDATE:', payload);
          // Immediate fetch for instant context
          fetchContractData();
        }
      )
      .subscribe();

    const equipmentChannel = supabase
      .channel(`equipment-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
          filter: `contract_id=eq.${contractId}`
        },
        (payload) => {
          console.log('📡 Equipment updated - INSTANT UPDATE:', payload);
          // Immediate fetch for instant context
          fetchContractData();
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel(`services-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_services',
          filter: `contract_id=eq.${contractId}`
        },
        (payload) => {
          console.log('📡 Services updated - INSTANT UPDATE:', payload);
          // Immediate fetch for instant context
          fetchContractData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contractChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(servicesChannel);
    };
  }, [contractId, fetchContractData]);

  return {
    contractData,
    isLoading,
    refetch: fetchContractData
  };
};
