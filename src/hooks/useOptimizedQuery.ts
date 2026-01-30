import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface QueryOptions {
  table: TableName;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

interface QueryResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useOptimizedQuery<T = any>(options: QueryOptions): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stabilize complex objects using useMemo to prevent unnecessary re-renders
  const filtersKey = useMemo(() => JSON.stringify(options.filters), [options.filters]);
  const orderByKey = useMemo(() => JSON.stringify(options.orderBy), [options.orderBy]);

  const fetchData = useCallback(async () => {
    if (!options.enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from(options.table as unknown)
        .select(options.select || '*');

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setData(result as T[]);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        console.error(`Query error for ${options.table}:`, err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    options.table,
    options.select,
    filtersKey,
    orderByKey,
    options.limit,
    options.enabled
  ]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Set up interval if specified
    let intervalId: NodeJS.Timeout | null = null;
    if (options.refetchInterval && options.refetchInterval > 0) {
      intervalId = setInterval(fetchData, options.refetchInterval);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchData, options.refetchInterval]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}

export default useOptimizedQuery;