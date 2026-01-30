import React, { Suspense, memo } from 'react';
import { LoadingCard } from '@/components/AdvancedLoadingStates';

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const LazyRoute = memo<LazyRouteProps>(({ 
  children, 
  fallback, 
  className 
}) => {
  const defaultFallback = (
    <div className={`p-6 space-y-4 ${className || ''}`}>
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
});

LazyRoute.displayName = 'LazyRoute';

export default LazyRoute;