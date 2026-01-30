
import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMobileViewport } from '@/lib/mobile';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right';
  className?: string;
}

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  title,
  position = 'left',
  className 
}: MobileDrawerProps) {
  const { isMobile } = useMobileViewport();

  // Handle body scroll lock when drawer is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 z-50 h-full bg-background border-r shadow-lg transition-transform duration-300 ease-out",
          position === 'left' ? 'left-0' : 'right-0',
          isOpen 
            ? 'translate-x-0' 
            : position === 'left' 
              ? '-translate-x-full' 
              : 'translate-x-full',
          "w-80 max-w-[80vw]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-auto h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

// Mobile drawer trigger component
interface MobileDrawerTriggerProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function MobileDrawerTrigger({ 
  onClick, 
  className,
  label = "Abrir menu"
}: MobileDrawerTriggerProps) {
  const { isMobile } = useMobileViewport();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("h-10 w-10 p-0", className)}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
