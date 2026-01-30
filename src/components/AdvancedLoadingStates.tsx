import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingCardProps {
  className?: string;
  showHeader?: boolean;
  headerHeight?: number;
  contentLines?: number;
  animate?: boolean;
}

export const LoadingCard = memo<LoadingCardProps>(({ 
  className, 
  showHeader = true, 
  headerHeight = 6,
  contentLines = 3,
  animate = true 
}) => (
  <Card className={cn(animate && "animate-pulse", className)}>
    {showHeader && (
      <CardHeader className="pb-3">
        <Skeleton className={`h-${headerHeight} w-3/4 mb-2`} />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
    )}
    <CardContent className="space-y-3">
      {Array.from({ length: contentLines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 w-${i === contentLines - 1 ? '2/3' : 'full'}`} />
      ))}
    </CardContent>
  </Card>
));

LoadingCard.displayName = 'LoadingCard';

interface ContractSkeletonProps {
  count?: number;
  className?: string;
}

export const ContractSkeleton = memo<ContractSkeletonProps>(({ count = 6, className }) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

ContractSkeleton.displayName = 'ContractSkeleton';

interface MaintenanceSkeletonProps {
  count?: number;
  className?: string;
}

export const MaintenanceSkeleton = memo<MaintenanceSkeletonProps>(({ count = 8, className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

MaintenanceSkeleton.displayName = 'MaintenanceSkeleton';

interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton = memo<DashboardSkeletonProps>(({ className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Metrics Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <LoadingCard 
          key={index}
          showHeader={false}
          contentLines={2}
          className="p-4"
        />
      ))}
    </div>
    
    {/* Main Content Areas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LoadingCard contentLines={6} />
      <LoadingCard contentLines={5} />
    </div>
    
    {/* Additional Section */}
    <LoadingCard contentLines={4} />
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton = memo<TableSkeletonProps>(({ 
  rows = 10, 
  columns = 5, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Table Header */}
    <div className="flex space-x-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 py-2 animate-pulse">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={colIndex} 
            className={`h-4 flex-1 ${colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-1/6' : ''}`} 
          />
        ))}
      </div>
    ))}
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

export default {
  LoadingCard,
  ContractSkeleton,
  MaintenanceSkeleton,
  DashboardSkeleton,
  TableSkeleton
};