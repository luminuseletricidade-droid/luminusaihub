import React from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'maintenance' | 'meeting' | 'deadline';
  status: 'pending' | 'in_progress' | 'completed';
  technician?: string;
  client?: string;
  contractType?: 'Manutenção' | 'Híbrido' | 'Locação';
}

interface DailyCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotDoubleClick?: (date: Date, hour: number) => void;
}

const DailyCalendarView: React.FC<DailyCalendarViewProps> = ({
  events,
  selectedDate,
  onEventClick,
  onTimeSlotDoubleClick
}) => {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 to 22:00
  
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour < 6 || currentHour > 22) return null;
    
    // Calculate percentage position within the visible hours
    const totalMinutes = (currentHour - 6) * 60 + currentMinute;
    const maxMinutes = 16 * 60; // 16 hours * 60 minutes
    return (totalMinutes / maxMinutes) * 100;
  };

  const getEventsForHour = (hour: number) => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    return events.filter(event => {
      if (event.date !== dateString) return false;
      const eventHour = parseInt(event.time.split(':')[0]);
      return eventHour === hour;
    });
  };

  const getStatusBadge = (status: CalendarEvent['status']) => {
    const config = {
      pending: { variant: 'secondary' as const, label: 'Pendente' },
      in_progress: { variant: 'default' as const, label: 'Em Andamento' },
      completed: { variant: 'outline' as const, label: 'Concluído' }
    };
    
    const statusConfig = config[status] || config.pending;
    const { variant, label } = statusConfig;
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const currentTimePosition = getCurrentTimePosition();
  const isSelectedDateToday = isToday(selectedDate);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Time grid */}
          <div className="relative border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
            {/* Current time line */}
            {currentTimePosition !== null && isSelectedDateToday && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 shadow-sm"
                style={{ 
                  top: `${currentTimePosition}%`,
                  marginLeft: '80px' // Offset for hour column
                }}
              >
                <div className="absolute -left-2 -top-1 w-4 h-2 bg-red-500 rounded-full"></div>
                <div className="absolute -right-2 -top-1 w-4 h-2 bg-red-500 rounded-full"></div>
              </div>
            )}

            {hours.map((hour) => {
              const hourEvents = getEventsForHour(hour);
              return (
                <div key={hour} className="flex border-b border-border last:border-b-0">
                  <div className="w-20 text-xs text-muted-foreground p-4 border-r border-border bg-muted/30 flex items-center">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div 
                    className={`flex-1 min-h-[80px] p-2 cursor-pointer hover:bg-muted/20 transition-colors ${
                      isSelectedDateToday ? 'bg-primary/5' : ''
                    }`}
                    onDoubleClick={() => onTimeSlotDoubleClick?.(selectedDate, hour)}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-primary/10 text-primary border border-primary/20 rounded p-2 mb-2 cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="font-medium text-sm mb-1">{event.title}</div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1 text-xs opacity-75">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                          {getStatusBadge(event.status)}
                        </div>
                        {event.technician && (
                          <div className="flex items-center space-x-1 text-xs opacity-75 mb-1">
                            <User className="h-3 w-3" />
                            <span>{event.technician}</span>
                          </div>
                        )}
                        {event.client && (
                          <div className="text-xs opacity-75">
                            Cliente: {event.client}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyCalendarView;