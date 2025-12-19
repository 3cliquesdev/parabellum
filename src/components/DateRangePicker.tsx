import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfToday, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

const presets: Record<PresetKey, { label: string; icon: string; getRange: () => DateRange }> = {
  today: {
    label: 'Hoje',
    icon: '📅',
    getRange: () => ({
      from: startOfToday(),
      to: startOfToday(),
    }),
  },
  yesterday: {
    label: 'Ontem',
    icon: '📅',
    getRange: () => ({
      from: startOfYesterday(),
      to: endOfYesterday(),
    }),
  },
  thisWeek: {
    label: 'Esta Semana',
    icon: '📅',
    getRange: () => ({
      from: startOfWeek(new Date(), { locale: ptBR }),
      to: endOfWeek(new Date(), { locale: ptBR }),
    }),
  },
  lastWeek: {
    label: 'Semana Passada',
    icon: '📅',
    getRange: () => ({
      from: startOfWeek(subWeeks(new Date(), 1), { locale: ptBR }),
      to: endOfWeek(subWeeks(new Date(), 1), { locale: ptBR }),
    }),
  },
  thisMonth: {
    label: 'Este Mês',
    icon: '📅',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  lastMonth: {
    label: 'Mês Passado',
    icon: '📅',
    getRange: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  thisYear: {
    label: 'Este Ano',
    icon: '📅',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  lastYear: {
    label: 'Ano Passado',
    icon: '📅',
    getRange: () => ({
      from: startOfYear(subYears(new Date(), 1)),
      to: endOfYear(subYears(new Date(), 1)),
    }),
  },
  custom: {
    label: 'Personalizado',
    icon: '🎯',
    getRange: () => ({
      from: undefined,
      to: undefined,
    }),
  },
};

const presetOrder: PresetKey[] = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear'];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = (preset: PresetKey) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      onChange(presets[preset].getRange());
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange(range);
    setActivePreset('custom');
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  const getDisplayLabel = () => {
    if (activePreset === 'custom' && value?.from && value?.to) {
      return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    return `${presets[activePreset].icon} ${presets[activePreset].label}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Dropdown de Presets */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <span>{getDisplayLabel()}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] bg-background z-50">
          {presetOrder.map((key) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handlePresetChange(key)}
              className={cn(
                "cursor-pointer",
                activePreset === key && "bg-accent font-medium"
              )}
            >
              {presets[key].icon} {presets[key].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Calendário Personalizado */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === 'custom' ? "default" : "outline"}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {activePreset === 'custom' && value?.from && value?.to ? (
              <span className="hidden sm:inline">
                {format(value.from, "dd/MM", { locale: ptBR })} - {format(value.to, "dd/MM", { locale: ptBR })}
              </span>
            ) : (
              <span className="hidden sm:inline">Período Personalizado</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end">
          <Calendar
            mode="range"
            selected={value}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
