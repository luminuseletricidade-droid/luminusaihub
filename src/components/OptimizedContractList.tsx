import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import OptimizedContractCard from '@/components/OptimizedContractCard';
import VirtualizedList from '@/components/VirtualizedList';
import { Search, Filter, Eye, Edit, MessageCircle } from 'lucide-react';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';

interface Contract {
  id: string;
  contract_number: string;
  client_name: string;
  client?: { name: string; phone?: string; contact_person?: string };
  contract_type: string;
  status: string;
  value?: number;
  start_date?: string;
  end_date?: string;
  equipment_type?: string;
  maintenance_count?: number;
  operational_status?: string;
  alerts?: string[];
  created_at: string;
}

interface OptimizedContractListProps {
  contracts: Contract[];
  searchTerm: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onChat: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const OptimizedContractList = memo<OptimizedContractListProps>(({
  contracts,
  searchTerm,
  onView,
  onEdit,
  onChat,
  onStatusChange,
  onArchive,
  onDelete,
  loading = false
}) => {
  const { addCleanup } = useMemoryCleanup();

  // Memoized filtered contracts to prevent unnecessary recalculations
  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts;
    
    const searchLower = searchTerm.toLowerCase();
    return contracts.filter(contract => {
      const clientName = contract.client?.name || contract.client_name || '';
      return (
        clientName.toLowerCase().includes(searchLower) ||
        contract.contract_number.toLowerCase().includes(searchLower) ||
        contract.equipment_type?.toLowerCase().includes(searchLower)
      );
    });
  }, [contracts, searchTerm]);

  // Memoized render function for virtual list
  const renderContractItem = useCallback((contract: Contract, index: number) => (
    <div key={contract.id} className="p-2">
      <OptimizedContractCard
        contract={contract}
        onView={(id) => onView(id)}
        onEdit={(id) => onEdit(id)}
      />
    </div>
  ), [onView, onEdit]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-48"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredContracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-muted-foreground">
            {searchTerm ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
                <p>Tente ajustar os termos de busca ou filtros.</p>
              </>
            ) : (
              <>
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum contrato cadastrado</h3>
                <p>Comece adicionando seu primeiro contrato.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use virtualized list for large datasets (>50 contracts)
  if (filteredContracts.length > 50) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Exibindo {filteredContracts.length} contratos (visualização otimizada)
        </div>
        <VirtualizedList
          items={filteredContracts}
          height={600}
          itemHeight={200}
          renderItem={renderContractItem}
          className="border rounded-lg"
        />
      </div>
    );
  }

  // Regular list for smaller datasets
  return (
    <div className="space-y-4">
      {filteredContracts.map((contract) => (
        <OptimizedContractCard
          key={contract.id}
          contract={contract}
          onView={(id) => onView(id)}
          onEdit={(id) => onEdit(id)}
        />
      ))}
    </div>
  );
});

OptimizedContractList.displayName = 'OptimizedContractList';

export default OptimizedContractList;