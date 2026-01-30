import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
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
import {
  LayoutDashboard,
  FileText,
  Users,
  Wrench,
  Calendar,
  BarChart3,
  Brain,
  User,
  LogOut,
  ChevronDown,
  ClipboardList,
  AlertTriangle,
  Clock,
  Settings,
  MapPin
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";

// Menu item interface with optional submenu
interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  submenu?: { title: string; url: string; icon: any }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Agentes IA", url: "/app/ai-agents", icon: Brain },
  { title: "Clientes", url: "/app/clients", icon: Users },
  { title: "Contratos", url: "/app/contracts", icon: FileText },
  { title: "Manutenções", url: "/app/maintenances", icon: Wrench },
  { title: "Cronogramas", url: "/app/cronogramas", icon: Clock },
  { title: "Calendário", url: "/app/calendar", icon: Calendar },
  {
    title: "Relatórios",
    icon: BarChart3,
    submenu: [
      { title: "Painel de Manutenção", url: "/app/reports", icon: ClipboardList },
      { title: "Backlogs Recorrentes", url: "/app/reports/backlogs", icon: AlertTriangle },
    ]
  },
  {
    title: "Configurações",
    icon: Settings,
    submenu: [
      { title: "Regiões", url: "/app/settings/regions", icon: MapPin },
    ]
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]); // Start collapsed

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isSubmenuOpen = (title: string) => openSubmenus.includes(title);

  const isSubmenuActive = (item: MenuItem) => {
    if (!item.submenu) return false;
    return item.submenu.some(sub => currentPath === sub.url || currentPath.startsWith(sub.url + '/'));
  };
  
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const getUserInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.submenu ? (
                    // Item with submenu
                    <div>
                      <SidebarMenuButton
                        isActive={isSubmenuActive(item)}
                        onClick={() => toggleSubmenu(item.title)}
                        className={cn(
                          "w-full justify-between",
                          isSubmenuActive(item) && "bg-accent/50 text-accent-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isSubmenuOpen(item.title) ? "rotate-0" : "-rotate-90"
                          )} />
                        )}
                      </SidebarMenuButton>

                      {/* Submenu items */}
                      {!isCollapsed && isSubmenuOpen(item.title) && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                          {item.submenu.map((subItem) => (
                            <NavLink
                              key={subItem.url}
                              to={subItem.url}
                              className={({ isActive: active }) => cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                                active
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "hover:bg-accent/50"
                              )}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular item without submenu
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url!} className={getNavClass}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
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
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.email ? getUserInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
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
            {!isCollapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}