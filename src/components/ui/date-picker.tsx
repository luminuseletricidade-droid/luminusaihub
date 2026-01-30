import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  value?: Date | string;
  onChange?: (date: Date | undefined) => void;
  onChangeString?: (date: string) => void; // Para compatibilidade com inputs nativos
  placeholder?: string;
  disabled?: boolean;
  allowWeekends?: boolean;
  className?: string;
  id?: string;
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
}

export function DatePicker({
  value,
  onChange,
  onChangeString,
  placeholder = "Selecione uma data",
  disabled = false,
  allowWeekends = true,
  className,
  id,
  disablePastDates = false,
  disableFutureDates = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      // Parse YYYY-MM-DD to Date
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return value;
  });

  React.useEffect(() => {
    if (!value) {
      setDate(undefined);
      return;
    }
    if (typeof value === 'string') {
      const [year, month, day] = value.split('-').map(Number);
      setDate(new Date(year, month - 1, day));
    } else {
      setDate(value);
    }
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    onChange?.(selectedDate);

    // Se onChangeString foi fornecido, converter Date para YYYY-MM-DD
    if (onChangeString) {
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        onChangeString(`${year}-${month}-${day}`);
      } else {
        onChangeString('');
      }
    }

    // Fechar o popover após selecionar a data
    setOpen(false);
  };

  const getDisabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (disablePastDates && date < today) {
      return true;
    }

    if (disableFutureDates && date > today) {
      return true;
    }

    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          allowWeekends={allowWeekends}
          disabled={getDisabledDates}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
