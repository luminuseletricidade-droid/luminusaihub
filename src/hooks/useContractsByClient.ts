import { useMemo } from 'react';

interface ContractsByClient {
  [clientName: string]: unknown[];
}

export const useContractsByClient = (contracts: unknown[]) => {
  const contractsByClient = useMemo(() => {
    const grouped: ContractsByClient = {};
    
    contracts.forEach(contract => {
      // Usar client_name do contrato (snapshot) ao invés do relacionamento com clients
      const clientName = contract.client_name || contract.client?.name || 'Cliente não informado';

      if (!grouped[clientName]) {
        grouped[clientName] = [];
      }

      grouped[clientName].push(contract);
    });
    
    // Ordenar contratos dentro de cada cliente por data de criação (mais recentes primeiro)
    Object.keys(grouped).forEach(clientName => {
      grouped[clientName].sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || '').getTime();
        const dateB = new Date(b.created_at || b.updated_at || '').getTime();
        return dateB - dateA;
      });
    });
    
    return grouped;
  }, [contracts]);

  const clientStats = useMemo(() => {
    const stats: {
      [clientName: string]: {
        totalContracts: number;
        activeContracts: number;
        totalValue: number;
        expiringContracts: number;
      }
    } = {};
    
    Object.keys(contractsByClient).forEach(clientName => {
      const clientContracts = contractsByClient[clientName];
      const today = new Date();
      
      stats[clientName] = {
        totalContracts: clientContracts.length,
        activeContracts: clientContracts.filter(c => c.status === 'active').length,
        totalValue: clientContracts.reduce((sum, c) => sum + (c.value || 0), 0),
        expiringContracts: clientContracts.filter(c => {
          const endDate = new Date(c.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length
      };
    });
    
    return stats;
  }, [contractsByClient]);

  // Ordenar clientes por número de contratos ativos (descendente)
  const sortedClientNames = useMemo(() => {
    return Object.keys(contractsByClient).sort((a, b) => {
      const statsA = clientStats[a];
      const statsB = clientStats[b];
      
      // Primeiro por contratos ativos, depois por total de contratos
      if (statsA.activeContracts !== statsB.activeContracts) {
        return statsB.activeContracts - statsA.activeContracts;
      }
      
      return statsB.totalContracts - statsA.totalContracts;
    });
  }, [contractsByClient, clientStats]);

  return {
    contractsByClient,
    clientStats,
    sortedClientNames,
    totalClients: Object.keys(contractsByClient).length
  };
};