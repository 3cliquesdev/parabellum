import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface GlobalFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const SOURCE_OPTIONS = [
  { value: "all", label: "Todas as Fontes" },
  { value: "parceiros", label: "Parceiros" },
  { value: "3cliques", label: "3 Cliques" },
  { value: "comercial", label: "Comercial" },
  { value: "organico", label: "Orgânico" },
];

export function GlobalFilters({
  dateRange,
  onDateRangeChange,
  sourceFilter,
  onSourceFilterChange,
  onRefresh,
  isRefreshing,
}: GlobalFiltersProps) {
  const activeFilters = sourceFilter !== "all" ? 1 : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4 bg-card rounded-xl border shadow-sm">
      {/* Left side - Date Range */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
          {activeFilters > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilters} ativo{activeFilters > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
        />
      </div>

      {/* Right side - Additional Filters + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        )}
      </div>
    </div>
  );
}
