import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DatePickerMiniProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | undefined) => void;
  events: unknown[];
  disablePastDates?: boolean;
}

const DatePickerMini: React.FC<DatePickerMiniProps> = ({
  selectedDate,
  onDateSelect,
  events,
  disablePastDates = false
}) => {
  // Get dates that have events
  const getEventDates = () => {
    const eventDates = new Set();
    events.forEach(event => {
      if (event.date) {
        eventDates.add(event.date);
      }
    });
    return eventDates;
  };

  const eventDates = getEventDates();

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={onDateSelect}
        disabled={disablePastDates ? (date) => date < new Date(new Date().setHours(0, 0, 0, 0)) : undefined}
        className={cn("p-2 pointer-events-auto border rounded-lg")}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 text-xs",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        modifiers={{
          hasEvent: (date) => {
            const dateString = date.toISOString().split('T')[0];
            return eventDates.has(dateString);
          }
        }}
        modifiersStyles={{
          hasEvent: {
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            color: 'hsl(var(--primary))',
            fontWeight: 'bold'
          }
        }}
      />
      <div className="space-y-2 text-xs">
        <div className="text-muted-foreground">
          Clique em uma data para ver as atividades
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded bg-primary/10 border border-primary/20"></div>
          <span className="text-muted-foreground">Dias com atividades</span>
        </div>
      </div>
    </div>
  );
};

export default DatePickerMini;