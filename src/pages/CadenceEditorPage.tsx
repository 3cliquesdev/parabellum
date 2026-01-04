import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Play, TestTube, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CadenceFlowEditor } from "@/components/cadences/CadenceFlowEditor";
import { CadenceTemplatesDialog } from "@/components/cadences/CadenceTemplatesDialog";
import { CadenceTestDialog } from "@/components/cadences/CadenceTestDialog";

interface CadenceData {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function CadenceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(isNew);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // Fetch cadence data
  const { data: cadence, isLoading } = useQuery({
    queryKey: ["cadence", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("cadences")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as CadenceData;
    },
    enabled: !isNew,
  });

  // Fetch steps
  const { data: steps = [], refetch: refetchSteps } = useQuery({
    queryKey: ["cadence-steps", id],
    queryFn: async () => {
      if (isNew) return [];
      const { data, error } = await supabase
        .from("cadence_steps")
        .select("*")
        .eq("cadence_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (cadence) {
      setName(cadence.name);
      setDescription(cadence.description || "");
      setIsActive(cadence.is_active);
    }
  }, [cadence]);

  // Create/Update cadence mutation
  const saveCadenceMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const { data, error } = await supabase
          .from("cadences")
          .insert({ name, description: description || null, is_active: isActive })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from("cadences")
          .update({ name, description: description || null, is_active: isActive })
          .eq("id", id);
        if (error) throw error;
        return cadence;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cadences"] });
      queryClient.invalidateQueries({ queryKey: ["cadence", id] });
      toast({ title: isNew ? "Cadência criada!" : "Cadência salva!" });
      if (isNew && data) {
        navigate(`/cadences/${data.id}/edit`, { replace: true });
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }
    setIsSaving(true);
    await saveCadenceMutation.mutateAsync();
    setIsSaving(false);
  };

  const handleApplyTemplate = async (templateSteps: any[]) => {
    if (isNew) {
      // First create the cadence
      const { data: newCadence, error } = await supabase
        .from("cadences")
        .insert({ name: name || "Nova Cadência", description, is_active: isActive })
        .select()
        .single();

      if (error) {
        toast({ variant: "destructive", title: "Erro ao criar cadência", description: error.message });
        return;
      }

      // Then add the steps
      const stepsToInsert = templateSteps.map((step, index) => ({
        cadence_id: newCadence.id,
        step_type: step.type,
        position: index,
        day_offset: step.day_offset || 0,
        task_title: step.title,
        task_description: step.description || null,
        message_template: step.template || step.message || step.script || null,
        is_automated: step.type === "email" || step.type === "delay",
        position_x: 400,
        position_y: 100 + index * 150,
      }));

      const { error: stepsError } = await supabase.from("cadence_steps").insert(stepsToInsert);
      if (stepsError) {
        toast({ variant: "destructive", title: "Erro ao criar passos", description: stepsError.message });
        return;
      }

      toast({ title: "Template aplicado com sucesso!" });
      navigate(`/cadences/${newCadence.id}/edit`, { replace: true });
    } else {
      // Delete existing steps and add new ones
      await supabase.from("cadence_steps").delete().eq("cadence_id", id);

      const stepsToInsert = templateSteps.map((step, index) => ({
        cadence_id: id,
        step_type: step.type,
        position: index,
        day_offset: step.day_offset || 0,
        task_title: step.title,
        task_description: step.description || null,
        message_template: step.template || step.message || step.script || null,
        is_automated: step.type === "email" || step.type === "delay",
        position_x: 400,
        position_y: 100 + index * 150,
      }));

      const { error } = await supabase.from("cadence_steps").insert(stepsToInsert);
      if (error) {
        toast({ variant: "destructive", title: "Erro ao aplicar template", description: error.message });
        return;
      }

      refetchSteps();
      toast({ title: "Template aplicado com sucesso!" });
    }
    setShowTemplates(false);
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cadences")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da cadência..."
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 w-64"
            />
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Ativa" : "Pausada"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Switch 
              id="active-toggle" 
              checked={isActive} 
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-toggle" className="text-sm">Ativa</Label>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowTemplates(true)}
          >
            <Sparkles className="h-4 w-4" />
            Templates
          </Button>

          {!isNew && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowTestDialog(true)}
            >
              <TestTube className="h-4 w-4" />
              Testar
            </Button>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </header>

      {/* Main Content - Flow Editor */}
      <main className="flex-1 overflow-hidden">
        {isNew ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Comece com um Template</h2>
              <p className="text-muted-foreground">
                Escolha um dos nossos templates prontos ou crie uma cadência do zero.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => setShowTemplates(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Ver Templates
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await handleSave();
                  }}
                >
                  Criar do Zero
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <CadenceFlowEditor 
            cadenceId={id!} 
            steps={steps}
            onStepsChange={refetchSteps}
          />
        )}
      </main>

      {/* Templates Dialog */}
      <CadenceTemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Test Dialog */}
      {!isNew && (
        <CadenceTestDialog
          open={showTestDialog}
          onOpenChange={setShowTestDialog}
          cadenceId={id!}
          steps={steps}
        />
      )}
    </div>
  );
}
