
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ResponsiveSidebar } from '@/components/ResponsiveSidebar';
import { MobileDrawer, MobileDrawerTrigger } from '@/components/MobileDrawer';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { NotificationSystem } from '@/components/NotificationSystem';
import { cn } from "@/lib/utils";
import { useMobileViewport, getMobilePadding } from "@/lib/mobile";

export const ResponsiveLayout = () => {
  const { isMobile } = useMobileViewport();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && <AppSidebar />}
        
        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={mobileMenuOpen}
          onClose={handleMobileMenuClose}
          title="Menu"
        >
          <ResponsiveSidebar onNavigate={handleMobileMenuClose} />
        </MobileDrawer>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced Mobile-First Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className={cn(
              "flex h-14 sm:h-16 items-center justify-between",
              getMobilePadding('compact')
            )}>
              {/* Left side - Mobile menu trigger + Logo */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Mobile menu trigger */}
                <MobileDrawerTrigger
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden"
                />
                
                {/* Desktop sidebar trigger */}
                {!isMobile && (
                  <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground" />
                )}
                
                {/* Logo - Responsive sizing */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="bg-gradient-to-br from-primary to-primary-dark p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                      Luminus
                    </h1>
                    <p className="text-xs text-muted-foreground -mt-1 hidden md:block">
                      Contract AI Hub
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Notifications only */}
              <div className="flex items-center">
                {/* Notifications System */}
                <NotificationSystem isMobile={isMobile} />
              </div>
            </div>
          </header>

          {/* Main content with mobile-optimized container */}
          <main className="flex-1 overflow-auto">
            <div className={cn(
              "container mx-auto max-w-7xl",
              getMobilePadding('normal'),
              "py-4 sm:py-6"
            )}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
