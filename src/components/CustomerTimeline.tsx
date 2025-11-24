import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText } from "lucide-react";
import TimelineItem from "./TimelineItem";
import type { Tables } from "@/integrations/supabase/types";

interface CustomerTimelineProps {
  timeline: Tables<"interactions">[];
  customerName: string;
  isLoading?: boolean;
}

export default function CustomerTimeline({ timeline, customerName, isLoading }: CustomerTimelineProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma interação ainda</h3>
        <p className="text-sm text-muted-foreground">
          A timeline de {customerName} será exibida aqui quando houver interações registradas
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Timeline de Interações</CardTitle>
        </div>
        <CardDescription>
          {timeline.length} {timeline.length === 1 ? "interação registrada" : "interações registradas"}
        </CardDescription>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-6">
          <div className="space-y-4">
            {timeline.map((interaction, index) => (
              <div key={interaction.id} className="relative">
                {/* Linha vertical conectora */}
                {index < timeline.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                )}
                
                <TimelineItem interaction={interaction} />
              </div>
            ))}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
