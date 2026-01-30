
import { cn } from '@/lib/utils';
import { useMobileViewport } from '@/lib/mobile';

interface MobileGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function MobileGrid({ 
  children, 
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}: MobileGridProps) {
  const { isMobile, isTablet } = useMobileViewport();
  
  const gapClasses = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  const getGridCols = () => {
    const { mobile = 1, tablet = 2, desktop = 3 } = cols;
    return `grid-cols-${mobile} sm:grid-cols-${tablet} lg:grid-cols-${desktop}`;
  };

  return (
    <div className={cn(
      "grid",
      getGridCols(),
      gapClasses[gap],
      // Mobile-specific adjustments
      isMobile && "px-1",
      className
    )}>
      {children}
    </div>
  );
}
