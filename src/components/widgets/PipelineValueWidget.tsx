import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineValue } from "@/hooks/usePipelineValue";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PipelineValueWidget() {
  const { totalPipelineValue, weightedValue, isLoading } = usePipelineValue();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Valor no Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Valor no Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary">
          {formatCurrency(totalPipelineValue)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Ponderado: {formatCurrency(weightedValue)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-xs">ℹ️</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  O valor ponderado considera a probabilidade de fechamento de
                  cada negócio (valor × probabilidade).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
