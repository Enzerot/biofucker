import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  dayRenderer?: (date: Date, isSelected: boolean) => React.ReactNode;
}

export function Calendar({ value, onChange, dayRenderer }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(value || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({
    length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1,
  });

  return (
    <div className="p-3 bg-background">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-accent rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {format(currentMonth, "LLLL yyyy", { locale: ru })}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-accent rounded-md"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground p-2"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`padding-${i}`} />
        ))}
        {days.map((day) => {
          const isSelected = value && isSameDay(day, value);
          return (
            <div key={day.toISOString()}>
              {dayRenderer ? (
                dayRenderer(day, !!isSelected)
              ) : (
                <button
                  onClick={() => onChange?.(day)}
                  className={cn(
                    "w-full h-9 rounded-md text-sm hover:bg-accent",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {format(day, "d")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
