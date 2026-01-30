
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { SimpleContractEditForm } from './contract-edit/SimpleContractEditForm';
import { ContractServicesSection } from './contract-edit/ContractServicesSection';

interface ContractEditFormSimplifiedProps {
  contract: unknown;
  onUpdate: () => void;
}

export const ContractEditFormSimplified = ({ contract, onUpdate }: ContractEditFormSimplifiedProps) => {
  const [contractData, setContractData] = useState(contract);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  // Single point of data fetching without circular dependencies
  const fetchContractData = useCallback(async () => {
    if (!contract?.id || isLoadingData) return;

    setIsLoadingData(true);
    
    try {
      console.log('🔄 Buscando dados do contrato:', contract.id);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!contracts_client_id_fkey(id, name, cnpj, email, phone, address),
          equipment!equipment_contract_id_fkey(id, type, model, location, manufacturer, serial_number, installation_date, quantity),
          contract_services!contract_services_contract_id_fkey(id, service_name, description, frequency, duration, order_index)
        `)
        .eq('id', contract.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar contrato:', error);
        return;
      }

      if (data) {
        console.log('✅ Dados do contrato carregados:', data);
        setContractData(data);
      }

    } catch (error) {
      console.error('💥 Erro em fetchContractData:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível carregar os dados do contrato.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [contract?.id, isLoadingData, toast]);

  // Initial data load
  useEffect(() => {
    if (contract?.id) {
      fetchContractData();
    }
  }, [contract?.id, fetchContractData]);

  // Update local state when contract prop changes
  useEffect(() => {
    if (contract) {
      setContractData(contract);
    }
  }, [contract]);

  const handleUpdate = () => {
    // Refresh data and notify parent
    fetchContractData();
    if (onUpdate) {
      onUpdate();
    }
  };

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  // Show error state if no contract data
  if (!contractData || !contractData.id) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        ⚠️ Dados do contrato não disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <SimpleContractEditForm 
        contract={contractData}
        onUpdate={handleUpdate}
      />
      
      <ContractServicesSection contractId={contractData.id} />
    </div>
  );
};
