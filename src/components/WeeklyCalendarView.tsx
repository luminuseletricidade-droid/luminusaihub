import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMobileViewport } from '@/lib/mobile';

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

interface WeeklyCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotDoubleClick?: (date: Date, hour: number) => void;
}

const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  events,
  selectedDate,
  onEventClick,
  onTimeSlotDoubleClick
}) => {
  const { isMobile } = useMobileViewport();
  const [mobileOffset, setMobileOffset] = useState(0);
  const MOBILE_DAYS = 3;

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const allWeekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // On mobile, show 3 days at a time with navigation
  const visibleDays = isMobile
    ? allWeekDays.slice(mobileOffset, mobileOffset + MOBILE_DAYS)
    : allWeekDays;
  const gridCols = isMobile ? MOBILE_DAYS + 1 : 8; // +1 for hour column
  
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

  const getEventsForDateAndHour = (date: Date, hour: number) => {
    const dateString = format(date, 'yyyy-MM-dd');
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
  const today = new Date();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Visualização Semanal</CardTitle>
          {isMobile && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileOffset(o => Math.max(0, o - MOBILE_DAYS))}
                disabled={mobileOffset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileOffset(o => Math.min(7 - MOBILE_DAYS, o + MOBILE_DAYS))}
                disabled={mobileOffset >= 7 - MOBILE_DAYS}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Header with days */}
          <div className={`grid gap-px mb-2`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
            <div className="text-xs font-medium text-muted-foreground p-2">Hora</div>
            {visibleDays.map((day, index) => (
              <div 
                key={index} 
                className={`text-xs font-medium p-2 text-center rounded ${
                  isToday(day) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <div>{format(day, 'EEE', { locale: ptBR })}</div>
                <div className={`text-lg ${isToday(day) ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
            {/* Current time line */}
            {currentTimePosition !== null && isSameDay(today, selectedDate) && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 shadow-sm"
                style={{ 
                  top: `${currentTimePosition}%`,
                  marginLeft: '12.5%' // Offset for hour column
                }}
              >
                <div className="absolute -left-2 -top-1 w-4 h-2 bg-red-500 rounded-full"></div>
                <div className="absolute -right-2 -top-1 w-4 h-2 bg-red-500 rounded-full"></div>
              </div>
            )}

            {hours.map((hour) => (
              <div key={hour} className="border-b border-border last:border-b-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                <div className="text-xs text-muted-foreground p-2 border-r border-border bg-muted/30">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {visibleDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDateAndHour(day, hour);
                  return (
                    <div 
                      key={dayIndex} 
                      className={`min-h-[60px] p-1 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/20 transition-colors ${
                        isToday(day) ? 'bg-primary/5' : ''
                      }`}
                      onDoubleClick={() => onTimeSlotDoubleClick?.(day, hour)}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="bg-primary/10 text-primary border border-primary/20 rounded p-1 mb-1 cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="text-xs font-medium truncate">{event.title}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs opacity-75">{event.time}</div>
                            {getStatusBadge(event.status)}
                          </div>
                          {event.technician && (
                            <div className="flex items-center space-x-1 text-xs opacity-75 mt-1">
                              <User className="h-2 w-2" />
                              <span className="truncate">{event.technician}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyCalendarView;