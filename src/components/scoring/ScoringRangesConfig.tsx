import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Flame, Thermometer, Snowflake } from "lucide-react";
import { useScoringRanges, useUpdateScoringRange, useRecalculateScores } from "@/hooks/useScoringConfig";
import { cn } from "@/lib/utils";

const classificationIcons = {
  quente: Flame,
  morno: Thermometer,
  frio: Snowflake,
};

const classificationLabels = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

export function ScoringRangesConfig() {
  const { data: ranges, isLoading } = useScoringRanges();
  const updateRange = useUpdateScoringRange();
  const recalculate = useRecalculateScores();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{
    min_score: number;
    max_score: number | null;
  }>({ min_score: 0, max_score: null });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleEdit = (range: any) => {
    setEditingId(range.id);
    setEditedValues({
      min_score: range.min_score,
      max_score: range.max_score,
    });
  };

  const handleSave = async (rangeId: string) => {
    await updateRange.mutateAsync({
      id: rangeId,
      updates: editedValues,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faixas de Classificação</CardTitle>
          <CardDescription>
            Defina os intervalos de pontuação para cada classificação de lead
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ranges?.map((range) => {
            const Icon = classificationIcons[range.classification as keyof typeof classificationIcons];
            const label = classificationLabels[range.classification as keyof typeof classificationLabels];
            
            return (
              <div 
                key={range.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border",
                  range.classification === "quente" && "border-green-500/30 bg-green-500/5",
                  range.classification === "morno" && "border-amber-500/30 bg-amber-500/5",
                  range.classification === "frio" && "border-red-500/30 bg-red-500/5",
                )}
              >
                <div 
                  className={cn(
                    "p-2 rounded-full",
                    range.classification === "quente" && "bg-green-500/20",
                    range.classification === "morno" && "bg-amber-500/20",
                    range.classification === "frio" && "bg-red-500/20",
                  )}
                >
                  {Icon && (
                    <Icon 
                      className={cn(
                        "h-5 w-5",
                        range.classification === "quente" && "text-green-600",
                        range.classification === "morno" && "text-amber-600",
                        range.classification === "frio" && "text-red-600",
                      )}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-semibold">{label}</p>
                  {editingId === range.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        value={editedValues.min_score}
                        onChange={(e) => setEditedValues({ 
                          ...editedValues, 
                          min_score: parseInt(e.target.value) 
                        })}
                        className="w-20 h-8"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="number"
                        value={editedValues.max_score ?? ""}
                        placeholder="∞"
                        onChange={(e) => setEditedValues({ 
                          ...editedValues, 
                          max_score: e.target.value ? parseInt(e.target.value) : null 
                        })}
                        className="w-20 h-8"
                      />
                      <span className="text-muted-foreground">pontos</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {range.min_score} {range.max_score ? `- ${range.max_score}` : "+"} pontos
                    </p>
                  )}
                </div>

                {editingId === range.id ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(range.id)}
                      disabled={updateRange.isPending}
                    >
                      {updateRange.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(range)}
                  >
                    Editar
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recalcular Scores</CardTitle>
          <CardDescription>
            Recalcule os scores de todos os leads existentes com base nas novas configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
            variant="outline"
          >
            {recalculate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalculando...
              </>
            ) : (
              "Recalcular Todos os Scores"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
