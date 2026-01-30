import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'overdue' | 'upcoming' | 'today' | 'info';
  title: string;
  message: string;
  contractId?: string;
  maintenanceId?: string;
  date?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationSystemProps {
  isMobile?: boolean;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ isMobile }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    // Load read notifications from localStorage
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const loadNotifications = React.useCallback(async () => {
    if (!user) return;

    try {
      // Load maintenances
      const { data: maintenances, error } = await supabase
        .from('maintenances')
        .select(`
          *,
          contracts!maintenances_contract_id_fkey (
            contract_number,
            client_name
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newNotifications: Notification[] = [];

      maintenances?.forEach(maintenance => {
        const scheduledDate = new Date(maintenance.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        const timeDiff = scheduledDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Overdue maintenances
        if (daysUntil < 0 && maintenance.status !== 'completed') {
          const notificationId = `overdue-${maintenance.id}`;
          newNotifications.push({
            id: notificationId,
            type: 'overdue',
            title: 'Manutenção Atrasada!',
            message: `${maintenance.contracts?.client_name} - ${maintenance.description || 'Manutenção'} está ${Math.abs(daysUntil)} dia(s) atrasada`,
            contractId: maintenance.contract_id,
            maintenanceId: maintenance.id,
            date: maintenance.scheduled_date,
            read: readNotifications.has(notificationId),
            createdAt: new Date().toISOString()
          });
        }
        // Today's maintenances
        else if (daysUntil === 0 && maintenance.status === 'scheduled') {
          const notificationId = `today-${maintenance.id}`;
          newNotifications.push({
            id: notificationId,
            type: 'today',
            title: 'Manutenção Hoje!',
            message: `${maintenance.contracts?.client_name} - ${maintenance.description || 'Manutenção'} agendada para hoje`,
            contractId: maintenance.contract_id,
            maintenanceId: maintenance.id,
            date: maintenance.scheduled_date,
            read: readNotifications.has(notificationId),
            createdAt: new Date().toISOString()
          });
        }
        // Upcoming maintenances (next 7 days)
        else if (daysUntil > 0 && daysUntil <= 7 && maintenance.status === 'scheduled') {
          const notificationId = `upcoming-${maintenance.id}`;
          newNotifications.push({
            id: notificationId,
            type: 'upcoming',
            title: 'Manutenção Próxima',
            message: `${maintenance.contracts?.client_name} - ${maintenance.description || 'Manutenção'} em ${daysUntil} dia(s)`,
            contractId: maintenance.contract_id,
            maintenanceId: maintenance.id,
            date: maintenance.scheduled_date,
            read: readNotifications.has(notificationId),
            createdAt: new Date().toISOString()
          });
        }
      });

      // Sort notifications by priority: overdue first, then today, then upcoming
      newNotifications.sort((a, b) => {
        const priority = { overdue: 0, today: 1, upcoming: 2, info: 3 };
        return priority[a.type] - priority[b.type];
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [readNotifications, user]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Check every minute
    
    // Clean up old read notifications (older than 7 days)
    const cleanupOldNotifications = () => {
      const stored = localStorage.getItem('readNotifications');
      if (stored) {
        const readIds = JSON.parse(stored) as string[];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Keep only notifications from the last 7 days
        const recentIds = readIds.filter(id => {
          // Extract date from ID if possible, otherwise keep it
          const match = id.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const notificationDate = new Date(match[0]);
            return notificationDate > sevenDaysAgo;
          }
          return true; // Keep if we can't determine the date
        });
        
        if (recentIds.length !== readIds.length) {
          localStorage.setItem('readNotifications', JSON.stringify(recentIds));
          setReadNotifications(new Set(recentIds));
        }
      }
    };
    
    cleanupOldNotifications();
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Persist to localStorage
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      localStorage.setItem('readNotifications', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Persist all notifications as read
    const allIds = notifications.map(n => n.id);
    setReadNotifications(prev => {
      const newSet = new Set([...prev, ...allIds]);
      localStorage.setItem('readNotifications', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'today':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'upcoming':
        return <Clock className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'overdue':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'today':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'upcoming':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const hasOverdue = notifications.some(n => n.type === 'overdue' && !n.read);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={hasOverdue ? "destructive" : "ghost"} 
          size="sm" 
          className={cn(
            "relative h-10 w-10 sm:h-11 sm:w-11",
            isMobile && "min-h-[44px] min-w-[44px]",
            hasOverdue && "animate-pulse hover:animate-none shadow-lg shadow-destructive/25"
          )}
        >
          <Bell className={cn(
            "h-5 w-5",
            hasOverdue ? "text-white" : "text-foreground"
          )} />
          {unreadCount > 0 && (
            <Badge 
              variant={hasOverdue ? "default" : "destructive"} 
              className={cn(
                "absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 p-0 flex items-center justify-center text-xs font-bold",
                hasOverdue ? "bg-yellow-500 text-black animate-bounce" : "",
                "border-2 border-background"
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 sm:w-96 max-h-[500px] overflow-y-auto" 
        align="end" 
        forceMount
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificações</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>Tudo em dia!</p>
            <p className="text-xs mt-1">Sem manutenções pendentes</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Destacar manutenções atrasadas no topo */}
            {notifications.filter(n => n.type === 'overdue').length > 0 && (
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b-2 border-destructive p-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="relative">
                    <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                    <div className="absolute inset-0 blur-sm bg-destructive/50 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-sm font-bold text-destructive uppercase tracking-wide">
                    ⚠️ {notifications.filter(n => n.type === 'overdue').length} Manutenções Atrasadas
                  </span>
                </div>
              </div>
            )}
            
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "relative p-3 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer",
                  !notification.read && "bg-accent/20",
                  notification.type === 'overdue' && "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-destructive shadow-sm"
                )}
                onClick={() => {
                  markAsRead(notification.id);
                  // Navigate to maintenance if applicable
                  if (notification.maintenanceId) {
                    window.location.href = `/app/maintenances?id=${notification.maintenanceId}`;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    getNotificationColor(notification.type)
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.date)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationSystem;