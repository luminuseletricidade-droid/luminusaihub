import { useState, useEffect, useMemo } from 'react';

interface FilterState {
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  priorityFilter: string;
  technicianFilter: string;
  contractFilter: string;
  dateRange?: { from?: Date; to?: Date };
}

interface Maintenance {
  id: string;
  status: string;
  type: string;
  priority: string;
  technician?: string;
  contract_number?: string;
  client_name?: string;
  description?: string;
  scheduled_date?: string;
  [key: string]: unknown;
}

export const useMaintenanceFilters = (maintenances: Maintenance[]) => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: 'all',
    typeFilter: 'all',
    priorityFilter: 'all',
    technicianFilter: '',
    contractFilter: '',
    dateRange: undefined
  });

  // Salvar filtros no localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('maintenanceFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erro ao carregar filtros salvos:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('maintenanceFilters', JSON.stringify(filters));
  }, [filters]);

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(maintenance => {
      // Filtro de busca textual
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = [
          maintenance.client_name,
          maintenance.technician,
          maintenance.description,
          maintenance.contract_number,
          maintenance.type
        ].some(field => 
          field?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        if (maintenance.status !== filters.statusFilter) return false;
      }

      // Filtro de tipo
      if (filters.typeFilter && filters.typeFilter !== 'all') {
        if (maintenance.type !== filters.typeFilter) return false;
      }

      // Filtro de prioridade
      if (filters.priorityFilter && filters.priorityFilter !== 'all') {
        if (maintenance.priority !== filters.priorityFilter) return false;
      }

      // Filtro de técnico
      if (filters.technicianFilter) {
        const technicianLower = filters.technicianFilter.toLowerCase();
        if (!maintenance.technician?.toLowerCase().includes(technicianLower)) return false;
      }

      // Filtro de contrato
      if (filters.contractFilter) {
        const contractLower = filters.contractFilter.toLowerCase();
        if (!maintenance.contract_number?.toLowerCase().includes(contractLower)) return false;
      }

      // Filtro de data
      if (filters.dateRange?.from && maintenance.scheduled_date) {
        const maintenanceDate = new Date(maintenance.scheduled_date);
        if (maintenanceDate < filters.dateRange.from) return false;
      }
      if (filters.dateRange?.to && maintenance.scheduled_date) {
        const maintenanceDate = new Date(maintenance.scheduled_date);
        if (maintenanceDate > filters.dateRange.to) return false;
      }

      return true;
    });
  }, [maintenances, filters]);

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      typeFilter: 'all',
      priorityFilter: 'all',
      technicianFilter: '',
      contractFilter: '',
      dateRange: undefined
    });
  };

  const getFilterStats = () => {
    return {
      total: maintenances.length,
      filtered: filteredMaintenances.length,
      hasActiveFilters: Object.values(filters).some(value => 
        value && value !== 'all' && 
        (typeof value === 'string' ? value.length > 0 : true)
      )
    };
  };

  return {
    filters,
    filteredMaintenances,
    updateFilter,
    clearFilters,
    getFilterStats
  };
};