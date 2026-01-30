
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  Calendar,
  BarChart3,
  Brain,
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  LogOut,
  ClipboardList,
  AlertTriangle,
  Settings,
  MapPin
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { useMobileViewport, getMobileSpacing, getMobilePadding } from "@/lib/mobile";

// Menu items with optional submenu support
interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  badge: string | null;
  submenu?: { title: string; url: string; icon: any }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard, badge: null },
  { title: "Agentes IA", url: "/app/ai-agents", icon: Brain, badge: null },
  { title: "Clientes", url: "/app/clients", icon: Users, badge: null },
  { title: "Contratos", url: "/app/contracts", icon: FileText, badge: null },
  { title: "Manutenções", url: "/app/maintenances", icon: Wrench, badge: null },
  { title: "Cronogramas", url: "/app/cronogramas", icon: Clock, badge: null },
  { title: "Calendário", url: "/app/calendar", icon: Calendar, badge: null },
  {
    title: "Relatórios",
    icon: BarChart3,
    badge: null,
    submenu: [
      { title: "Painel de Manutenção", url: "/app/reports", icon: ClipboardList },
      { title: "Backlogs Recorrentes", url: "/app/reports/backlogs", icon: AlertTriangle },
    ]
  },
  {
    title: "Configurações",
    icon: Settings,
    badge: null,
    submenu: [
      { title: "Regiões", url: "/app/settings/regions", icon: MapPin },
    ]
  },
];

interface ResponsiveSidebarProps {
  onNavigate?: () => void; // Callback for mobile navigation
}

export function ResponsiveSidebar({ onNavigate }: ResponsiveSidebarProps) {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useMobileViewport();
  const [searchTerm, setSearchTerm] = useState("");
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]); // Start collapsed
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const getUserInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };
  
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed" && !isMobile;
  
  // Track recently accessed items
  useEffect(() => {
    const currentItem = menuItems.find(item => item.url === currentPath);
    if (currentItem) {
      setRecentItems(prev => {
        const filtered = prev.filter(item => item !== currentItem.title);
        return [currentItem.title, ...filtered].slice(0, 3);
      });
    }
  }, [currentPath]);

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const isActive = (path: string) => currentPath === path;
  
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      // Mobile-friendly touch targets
      isMobile ? "px-4 py-3 min-h-[48px]" : "px-3 py-2.5",
      isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
    );

  const handleNavClick = () => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  };

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isSubmenuOpen = (title: string) => openSubmenus.includes(title);

  // Check if any submenu item is active
  const isSubmenuActive = (item: MenuItem) => {
    if (!item.submenu) return false;
    return item.submenu.some(sub => currentPath === sub.url || currentPath.startsWith(sub.url + '/'));
  };

  return (
    <Sidebar 
      collapsible={isMobile ? "none" : "icon"} 
      className={cn(
        "border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isMobile ? "w-full border-0" : "group-data-[collapsible=icon]:w-14"
      )}
    >
      <SidebarContent className={cn(
        isMobile ? "py-0" : "py-4 px-2"
      )}>
        {/* Search Bar - Enhanced for mobile */}
        {(!isCollapsed || isMobile) && (
          <div className={cn(
            isMobile ? "p-4 pb-2" : "px-2 mb-4"
          )}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 bg-sidebar-accent/50 border-0 focus-visible:ring-1 focus-visible:ring-sidebar-ring",
                  isMobile ? "h-12 text-base" : "h-9"
                )}
              />
            </div>
          </div>
        )}

        {/* Recent Items - Hidden when collapsed or searching */}
        {(!isCollapsed || isMobile) && !searchTerm && recentItems.length > 0 && (
          <SidebarGroup className={cn(
            "mb-2",
            isMobile && getMobilePadding('compact')
          )}>
            <SidebarGroupLabel className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              Recentes
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className={getMobileSpacing('tight')}>
                {recentItems.map((itemTitle) => {
                  const item = menuItems.find(m => m.title === itemTitle);
                  if (!item) return null;
                  return (
                    <SidebarMenuItem key={`recent-${item.title}`}>
                      <SidebarMenuButton asChild size={isMobile ? "lg" : "sm"}>
                        <NavLink 
                          to={item.url} 
                          className={getNavClass}
                          onClick={handleNavClick}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                          <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup className={isMobile ? getMobilePadding('compact') : undefined}>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Gestão</span>
            {(!isCollapsed || isMobile) && filteredMenuItems.length !== menuItems.length && (
              <Badge variant="secondary" className="text-xs">
                {filteredMenuItems.length}
              </Badge>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn(
              isMobile ? getMobileSpacing('tight') : "space-y-1"
            )}>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    // Item with submenu
                    <div>
                      <SidebarMenuButton
                        tooltip={isCollapsed && !isMobile ? item.title : undefined}
                        isActive={isSubmenuActive(item)}
                        size={isMobile ? "lg" : "default"}
                        onClick={() => toggleSubmenu(item.title)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isMobile ? "px-4 py-3 min-h-[48px]" : "px-3 py-2.5",
                          isSubmenuActive(item) && "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && (
                          <>
                            <span className="truncate flex-1">{item.title}</span>
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isSubmenuOpen(item.title) ? "rotate-0" : "-rotate-90"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>

                      {/* Submenu items */}
                      {(!isCollapsed || isMobile) && isSubmenuOpen(item.title) && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                          {item.submenu.map((subItem) => (
                            <NavLink
                              key={subItem.url}
                              to={subItem.url}
                              className={({ isActive: active }) => cn(
                                "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isMobile ? "px-3 py-2.5 min-h-[44px]" : "px-3 py-2",
                                active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              )}
                              onClick={handleNavClick}
                            >
                              <subItem.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{subItem.title}</span>
                              {isActive(subItem.url) && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                              )}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular item without submenu
                    <SidebarMenuButton
                      asChild
                      tooltip={isCollapsed && !isMobile ? item.title : undefined}
                      isActive={isActive(item.url!)}
                      size={isMobile ? "lg" : "default"}
                    >
                      <NavLink
                        to={item.url!}
                        className={getNavClass}
                        onClick={handleNavClick}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && (
                          <>
                            <span className="truncate flex-1">{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                            {isActive(item.url!) && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-2">
          {/* User Profile Button */}
          <NavLink 
            to="/app/profile" 
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
            onClick={handleNavClick}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.email ? getUserInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobile) && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.email?.split('@')[0]}</span>
                <span className="text-xs text-muted-foreground">Meu Perfil</span>
              </div>
            )}
          </NavLink>
          
          {/* Logout Button */}
          <Button 
            onClick={handleSignOut} 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3"
          >
            <LogOut className="h-4 w-4" />
            {(!isCollapsed || isMobile) && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
