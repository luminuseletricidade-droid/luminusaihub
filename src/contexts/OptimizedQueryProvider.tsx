import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Enhanced retry for network issues (5 attempts)
        return failureCount < 5;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000), // Max 60s delay
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Auto-refetch when network reconnects
    },
    mutations: {
      retry: 3, // More retries for mutations
      retryDelay: 2000,
    },
  },
});

interface OptimizedQueryProviderProps {
  children: React.ReactNode;
}

export const OptimizedQueryProvider: React.FC<OptimizedQueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export { queryClient };