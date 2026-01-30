import { useState, useEffect, useCallback, useRef } from 'react';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
}

export const useInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  threshold = 1.0,
  rootMargin = '100px',
  disabled = false
}: UseInfiniteScrollOptions) => {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const { addCleanup } = useMemoryCleanup();

  const handleFetchMore = useCallback(async () => {
    if (isFetching || !hasNextPage || disabled) return;

    try {
      setIsFetching(true);
      setError(null);
      await fetchNextPage();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch more data'));
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, hasNextPage, disabled, fetchNextPage]);

  // Set up intersection observer
  useEffect(() => {
    if (disabled || !hasNextPage) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isFetching) {
          handleFetchMore();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);
    observerRef.current = observer;

    // Cleanup function
    const cleanup = () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };

    addCleanup(cleanup);

    return cleanup;
  }, [disabled, hasNextPage, isFetching, handleFetchMore, threshold, rootMargin, addCleanup]);

  // Manual trigger function
  const triggerFetch = useCallback(() => {
    if (!disabled && hasNextPage && !isFetching) {
      handleFetchMore();
    }
  }, [disabled, hasNextPage, isFetching, handleFetchMore]);

  return {
    elementRef,
    isFetching,
    error,
    triggerFetch,
    hasNextPage: hasNextPage && !disabled
  };
};

export default useInfiniteScroll;