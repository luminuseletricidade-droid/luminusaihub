import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface MonthlyCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  events,
  selectedDate,
  onEventClick,
  onDateClick
}) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateString);
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'maintenance':
        return 'bg-primary/20 text-primary';
      case 'meeting':
        return 'bg-secondary/20 text-secondary-foreground';
      case 'deadline':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Header with days of week */}
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted/30">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonthDay = isCurrentMonth(day);
            const isTodayDay = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-1 border border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                  isTodayDay ? 'bg-primary/10 border-primary/30' : ''
                } ${!isCurrentMonthDay ? 'opacity-50' : ''}`}
                onClick={() => onDateClick?.(day)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isTodayDay ? 'text-primary font-bold' : isCurrentMonthDay ? '' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                  {isTodayDay && (
                    <div className="w-2 h-2 bg-red-500 rounded-full inline-block ml-1"></div>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded cursor-pointer hover:scale-105 transition-transform truncate ${getEventTypeColor(event.type)}`}
                      title={`${event.time} - ${event.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {event.time} - {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyCalendarView;