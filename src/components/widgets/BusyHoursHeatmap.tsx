import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useBusyHours } from "@/hooks/useBusyHours";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

interface BusyHoursHeatmapProps {
  startDate: Date;
  endDate: Date;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function BusyHoursHeatmap({ startDate, endDate }: BusyHoursHeatmapProps) {
  const { data, isLoading } = useBusyHours(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Find max count for color scaling
  const maxCount = Math.max(...(data?.map(d => d.count) || [1]), 1);

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted";
    const intensity = Math.min(count / maxCount, 1);
    const hue = 221; // Tech blue hue
    const saturation = 83;
    const lightness = 100 - (intensity * 40); // From 100% to 60%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getCellCount = (day: number, hour: number) => {
    return data?.find(d => d.day === day && d.hour === hour)?.count || 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Horários de Pico
        </CardTitle>
        <CardDescription>
          Mapa de calor de início de conversas por dia/hora
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hours header */}
            <div className="flex gap-1 mb-2 ml-12">
              {[0, 6, 12, 18].map(hour => (
                <div key={hour} className="text-xs text-muted-foreground w-8 text-center">
                  {hour}h
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-1">
              {DAYS.map((dayName, dayIndex) => (
                <div key={dayIndex} className="flex items-center gap-1">
                  <div className="text-xs font-medium w-10 text-muted-foreground">
                    {dayName}
                  </div>
                  <div className="flex gap-1">
                    {HOURS.map(hour => {
                      const count = getCellCount(dayIndex, hour);
                      return (
                        <div
                          key={hour}
                          className="w-6 h-6 rounded border border-border transition-all hover:ring-2 hover:ring-primary cursor-pointer"
                          style={{ backgroundColor: getColor(count) }}
                          title={`${dayName} ${hour}:00 - ${count} conversas`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: getColor(intensity * maxCount) }}
                  />
                ))}
              </div>
              <span>Mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
