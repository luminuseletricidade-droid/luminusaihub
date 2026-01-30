import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'maintenance' | 'meeting' | 'deadline';
  status: 'pending' | 'in_progress' | 'completed';
  technician?: string;
  client?: string;
}

interface CalendarViewsProps {
  events: CalendarEvent[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

export default function CalendarViews({ 
  events, 
  currentDate, 
  setCurrentDate, 
  selectedDate, 
  setSelectedDate 
}: CalendarViewsProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      newDate.setMonth(direction === 'prev' ? currentDate.getMonth() - 1 : currentDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(direction === 'prev' ? currentDate.getDate() - 7 : currentDate.getDate() + 7);
    } else if (viewMode === 'day') {
      newDate.setDate(direction === 'prev' ? currentDate.getDate() - 1 : currentDate.getDate() + 1);
    }
    
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
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

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks = [];
    let currentWeek = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const isToday = date.toDateString() === new Date().toDateString();
      const dayEvents = getEventsForDate(date);
      
      currentWeek.push(
        <div
          key={date.toISOString()}
          className={`h-24 border border-border p-1 cursor-pointer hover:bg-accent/50 transition-colors ${
            isToday ? 'bg-primary/5 border-primary/30' : ''
          } ${!isCurrentMonth ? 'opacity-50' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
            {date.getDate()}
          </div>
          <div className="space-y-1 mt-1">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className="text-xs p-1 rounded bg-primary/10 text-primary border border-primary/20"
                title={`${event.time} - ${event.title}`}
              >
                <div className="truncate font-medium">{event.title}</div>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 2} mais
              </div>
            )}
          </div>
        </div>
      );
      
      if (currentWeek.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-0">
            {currentWeek}
          </div>
        );
        currentWeek = [];
      }
    }
    
    return (
      <div className="space-y-0">
        <div className="grid grid-cols-7 gap-0 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}
        </div>
        {weeks}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(date => {
            const isToday = date.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDate(date);
            
            return (
              <Card key={date.toISOString()} className={`${isToday ? 'border-primary' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm ${isToday ? 'text-primary' : ''}`}>
                    {date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayEvents.map(event => (
                    <div key={event.id} className="p-2 rounded border bg-primary/5 border-primary/20">
                      <div className="text-xs font-medium">{event.time}</div>
                      <div className="text-sm">{event.title}</div>
                      {getStatusBadge(event.status)}
                    </div>
                  ))}
                  {dayEvents.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Sem eventos
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              <span className="text-sm text-muted-foreground">{dayEvents.length} eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hours.map(hour => {
              const hourString = `${hour.toString().padStart(2, '0')}:00`;
              const hourEvents = dayEvents.filter(event => event.time.startsWith(hour.toString().padStart(2, '0')));
              
              return (
                <div key={hour} className="flex border-b pb-2">
                  <div className="w-16 text-sm text-muted-foreground font-mono">
                    {hourString}
                  </div>
                  <div className="flex-1 space-y-1">
                    {hourEvents.map(event => (
                      <div key={event.id} className="p-3 rounded border bg-primary/5 border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{event.title}</div>
                          {getStatusBadge(event.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                          {event.technician && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{event.technician}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {hourEvents.length === 0 && (
                      <div className="h-8 flex items-center">
                        <div className="w-full border-t border-dashed border-muted"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>{formatDateHeader()}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg border bg-background">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-r-none"
              >
                Mês
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-none"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="rounded-l-none"
              >
                Dia
              </Button>
            </div>
            <div className="flex space-x-1">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </CardContent>
    </Card>
  );
}