import { useMemo, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchableItem {
  id: string;
  [key: string]: unknown;
}

interface SearchConfig<T> {
  searchFields: (keyof T)[];
  minSearchLength?: number;
  debounceMs?: number;
  caseSensitive?: boolean;
}

export function useSearchOptimization<T extends SearchableItem>(
  items: T[],
  config: SearchConfig<T>
) {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    searchFields,
    minSearchLength = 2,
    debounceMs = 300,
    caseSensitive = false
  } = config;

  // Debounce the search term to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Memoized search function for better performance
  const searchFunction = useCallback((item: T, term: string): boolean => {
    if (!term || term.length < minSearchLength) return true;
    
    const searchLower = caseSensitive ? term : term.toLowerCase();
    
    return searchFields.some(field => {
      const fieldValue = item[field];
      if (fieldValue == null) return false;
      
      const stringValue = String(fieldValue);
      const searchValue = caseSensitive ? stringValue : stringValue.toLowerCase();
      
      return searchValue.includes(searchLower);
    });
  }, [searchFields, minSearchLength, caseSensitive]);

  // Memoized filtered results
  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < minSearchLength) {
      return items;
    }

    return items.filter(item => searchFunction(item, debouncedSearchTerm));
  }, [items, debouncedSearchTerm, searchFunction, minSearchLength]);

  // Search statistics
  const searchStats = useMemo(() => ({
    totalItems: items.length,
    filteredItems: filteredItems.length,
    isFiltered: debouncedSearchTerm.length >= minSearchLength,
    searchTerm: debouncedSearchTerm
  }), [items.length, filteredItems.length, debouncedSearchTerm, minSearchLength]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filteredItems,
    searchStats,
    clearSearch
  };
}

export default useSearchOptimization;