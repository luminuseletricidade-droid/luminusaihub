/**
 * NetworkStatusBanner Component
 * Displays network connectivity status and triggers auto-retry on reconnect
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const NetworkStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setRetryCount(0);

      // Dispatch global event for components to trigger auto-retry
      window.dispatchEvent(new CustomEvent('network-reconnected'));

      // Hide reconnected message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setRetryCount(prev => prev + 1);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render if online and not showing reconnected message
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 p-2 text-center z-50 text-white text-sm font-medium transition-all duration-300 ${
        isOnline ? 'bg-green-600' : 'bg-destructive'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <Wifi className="h-4 w-4" />
          Conexão restaurada! Retomando operações...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Sem conexão com a internet
          {retryCount > 1 && (
            <span className="flex items-center gap-1 text-xs opacity-80">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Tentando reconectar...
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export default NetworkStatusBanner;
