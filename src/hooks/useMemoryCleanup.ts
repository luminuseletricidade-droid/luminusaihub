import { useEffect, useRef } from 'react';

interface CleanupFunction {
  (): void;
}

/**
 * Hook for managing cleanup functions and preventing memory leaks
 */
export const useMemoryCleanup = () => {
  const cleanupFunctionsRef = useRef<CleanupFunction[]>([]);
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  // Add cleanup function
  const addCleanup = (fn: CleanupFunction) => {
    cleanupFunctionsRef.current.push(fn);
  };

  // Create managed timeout
  const setTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = globalThis.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  };

  // Create managed interval
  const setInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = globalThis.setInterval(callback, delay);
    intervalsRef.current.add(interval);
    return interval;
  };

  // Create managed AbortController
  const createAbortController = (): AbortController => {
    const controller = new AbortController();
    abortControllersRef.current.add(controller);
    return controller;
  };

  // Clear specific timer/interval
  const clearTimeout = (timer: NodeJS.Timeout) => {
    globalThis.clearTimeout(timer);
    timersRef.current.delete(timer);
  };

  const clearInterval = (interval: NodeJS.Timeout) => {
    globalThis.clearInterval(interval);
    intervalsRef.current.delete(interval);
  };

  // Manual cleanup
  const cleanup = () => {
    // Clear all timers
    timersRef.current.forEach(timer => globalThis.clearTimeout(timer));
    timersRef.current.clear();

    // Clear all intervals
    intervalsRef.current.forEach(interval => globalThis.clearInterval(interval));
    intervalsRef.current.clear();

    // Abort all controllers
    abortControllersRef.current.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    abortControllersRef.current.clear();

    // Run cleanup functions
    cleanupFunctionsRef.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function error:', error);
      }
    });
    cleanupFunctionsRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    addCleanup,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    createAbortController,
    cleanup
  };
};