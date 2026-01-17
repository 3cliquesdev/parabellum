import { useTagCorrelations } from "@/hooks/useTagCorrelations";
import { Link2, Loader2, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface TagCorrelationsContentProps {
  startDate: Date;
  endDate: Date;
}

export function TagCorrelationsContent({ startDate, endDate }: TagCorrelationsContentProps) {
  const { data, isLoading } = useTagCorrelations(startDate, endDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { correlations, topInsight } = data || { correlations: [], topInsight: null };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tags que aparecem juntas nos tickets
        </p>
        
        {/* Insight automático */}
        {topInsight && (
          <Alert className="border-primary/50 bg-primary/5">
            <Lightbulb className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Insight:</span> {topInsight}
            </AlertDescription>
          </Alert>
        )}

        {correlations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma correlação encontrada</p>
            <p className="text-xs mt-1">Tickets precisam ter múltiplas tags</p>
          </div>
        ) : (
          <div className="space-y-3">
            {correlations.map((correlation, index) => (
              <div key={`${correlation.tag1.id}-${correlation.tag2.id}`} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Tag 1 com Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 shrink-0 cursor-help">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: correlation.tag1.color }}
                          />
                          <span className="text-sm font-medium truncate max-w-[100px] md:max-w-[140px]">
                            {correlation.tag1.name}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{correlation.tag1.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Seta */}
                    <span className="text-muted-foreground text-xs shrink-0">↔</span>
                    
                    {/* Tag 2 com Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 shrink-0 cursor-help">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: correlation.tag2.color }}
                          />
                          <span className="text-sm font-medium truncate max-w-[100px] md:max-w-[140px]">
                            {correlation.tag2.name}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{correlation.tag2.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {correlation.coOccurrences}x
                    </span>
                    <Badge 
                      variant={index === 0 ? 'default' : 'secondary'}
                      className="min-w-[50px] justify-center"
                    >
                      {correlation.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={correlation.percentage} 
                  className="h-1.5"
                  style={{ 
                    '--progress-color': correlation.tag1.color 
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
