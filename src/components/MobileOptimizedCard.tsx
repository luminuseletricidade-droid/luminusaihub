
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMobileViewport, getMobilePadding } from '@/lib/mobile';

interface MobileOptimizedCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive';
  onClick?: () => void;
}

export function MobileOptimizedCard({
  title,
  description,
  children,
  className,
  variant = 'default',
  onClick
}: MobileOptimizedCardProps) {
  const { isMobile } = useMobileViewport();

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        variant === 'interactive' && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        isMobile && "border-0 shadow-sm bg-card/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={cn(
        isMobile ? "pb-3 px-4 pt-4" : "pb-3"
      )}>
        <CardTitle className={cn(
          isMobile ? "text-lg" : "text-xl"
        )}>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={cn(
            isMobile ? "text-sm" : "text-base"
          )}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn(
        isMobile ? getMobilePadding('compact') + " pt-0" : undefined
      )}>
        {children}
      </CardContent>
    </Card>
  );
}
