"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarPopoverProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  hint?: string;
  id?: string;
  locale?: string;
  placeholder?: string;
}

interface CalendarDayCell {
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const DEFAULT_LOCALE = "en-US";

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toIsoDate = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const parseIsoDate = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const getLocaleCode = (locale?: string): string => {
  if (locale === "fr") {
    return "fr-FR";
  }
  if (locale === "ar") {
    return "ar-DZ";
  }
  return DEFAULT_LOCALE;
};

const buildCalendarCells = (viewMonth: Date): CalendarDayCell[] => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDayIndex = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayIso = toIsoDate(new Date());

  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstDayIndex + 1;
    let date: Date;
    let inCurrentMonth = true;

    if (dayOffset <= 0) {
      date = new Date(year, month - 1, daysInPrevMonth + dayOffset);
      inCurrentMonth = false;
    } else if (dayOffset > daysInMonth) {
      date = new Date(year, month + 1, dayOffset - daysInMonth);
      inCurrentMonth = false;
    } else {
      date = new Date(year, month, dayOffset);
    }

    const isoDate = toIsoDate(date);
    cells.push({
      isoDate,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isToday: isoDate === todayIso,
    });
  }

  return cells;
};

export function CalendarPopover({
  label,
  value,
  onChange,
  hint,
  id,
  locale,
  placeholder,
}: CalendarPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const selected = parseIsoDate(value);
    const anchor = selected ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const localeCode = getLocaleCode(locale);

  const monthLabel = useMemo(() => {
    return viewMonth.toLocaleDateString(localeCode, {
      month: "long",
      year: "numeric",
    });
  }, [localeCode, viewMonth]);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "short" });
    const startSunday = new Date(2024, 0, 7); // Sunday anchor
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(startSunday);
      date.setDate(startSunday.getDate() + offset);
      return formatter.format(date);
    });
  }, [localeCode]);

  const cells = useMemo(() => buildCalendarCells(viewMonth), [viewMonth]);

  const displayValue = useMemo(() => {
    if (!selectedDate) {
      return placeholder ?? "Select date";
    }
    return selectedDate.toLocaleDateString(localeCode, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [localeCode, placeholder, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        <button
          id={inputId}
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !selectedDate && "text-muted-foreground"
          )}
          onClick={() => {
            if (!isOpen) {
              const selected = parseIsoDate(value);
              if (selected) {
                setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
              }
            }
            setIsOpen((prev) => !prev);
          }}
        >
          <span>{displayValue}</span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full min-w-[280px] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent"
                onClick={() =>
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <p className="text-sm font-medium capitalize">{monthLabel}</p>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent"
                onClick={() =>
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {weekdayLabels.map((weekday) => (
                <span key={weekday} className="py-1">
                  {weekday}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const isSelected = value === cell.isoDate;
                return (
                  <button
                    key={cell.isoDate}
                    type="button"
                    className={cn(
                      "h-8 rounded-md text-sm transition-colors",
                      "hover:bg-accent",
                      !cell.inCurrentMonth && "text-muted-foreground/60",
                      cell.isToday && "border border-primary/40",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => {
                      onChange(cell.isoDate);
                      setIsOpen(false);
                    }}
                  >
                    {cell.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
