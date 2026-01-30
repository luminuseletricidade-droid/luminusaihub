import React from 'react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface YearlyCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateClick?: (date: Date) => void;
  onMonthClick?: (date: Date) => void;
}

const YearlyCalendarView: React.FC<YearlyCalendarViewProps> = ({
  events,
  selectedDate,
  onDateClick,
  onMonthClick
}) => {
  const yearStart = startOfYear(selectedDate);
  const yearEnd = endOfYear(selectedDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const getEventsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateString);
  };

  const getEventsCountForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.reduce((count, day) => {
      return count + getEventsForDate(day).length;
    }, 0);
  };

  const MiniMonth = ({ month }: { month: Date }) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const eventsCount = getEventsCountForMonth(month);

    return (
      <div 
        className="border rounded-lg p-2 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => onMonthClick?.(month)}
      >
        <div className="text-sm font-medium mb-2 text-center">
          {format(month, 'MMM', { locale: ptBR })}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
            <div key={index} className="text-center text-muted-foreground font-medium">
              {day}
            </div>
          ))}
          
          {days.map((day) => {
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isTodayDay = isToday(day);
            const hasEvents = getEventsForDate(day).length > 0;
            
            return (
              <div
                key={day.toISOString()}
                className={`text-center p-1 rounded cursor-pointer hover:bg-primary/20 transition-colors ${
                  isTodayDay ? 'bg-red-500 text-white font-bold' : ''
                } ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                ${hasEvents && !isTodayDay ? 'bg-primary/10 text-primary font-medium' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick?.(day);
                }}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
        
        {eventsCount > 0 && (
          <div className="text-xs text-center mt-2 text-primary font-medium">
            {eventsCount} evento{eventsCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          {format(selectedDate, 'yyyy')}
          {isToday(selectedDate) && (
            <div className="flex items-center text-sm text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              Ano atual
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {months.map((month) => (
            <MiniMonth key={month.toISOString()} month={month} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearlyCalendarView;