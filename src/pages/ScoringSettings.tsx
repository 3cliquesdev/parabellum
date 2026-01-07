import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScoringFieldsConfig } from "@/components/scoring/ScoringFieldsConfig";
import { ScoringRangesConfig } from "@/components/scoring/ScoringRangesConfig";

export default function ScoringSettings() {
  const navigate = useNavigate();

  return (
    <div className="p-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-8 w-8 text-amber-500" />
            Scoring de Qualificação
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure pontuação por resposta e faixas de classificação de leads
          </p>
        </div>
      </div>

      <Tabs defaultValue="scoring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scoring">Pontuação por Pergunta</TabsTrigger>
          <TabsTrigger value="ranges">Faixas de Classificação</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring">
          <ScoringFieldsConfig />
        </TabsContent>

        <TabsContent value="ranges">
          <ScoringRangesConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
