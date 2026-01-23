import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatFlowEditor } from "@/components/chat-flows/ChatFlowEditor";
import { useChatFlow, useUpdateChatFlow } from "@/hooks/useChatFlows";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ChatFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: flow, isLoading } = useChatFlow(id || null);
  const updateFlow = useUpdateChatFlow();

  const handleSave = (flowDef: { nodes: any[]; edges: any[] }) => {
    if (!id) return;
    
    updateFlow.mutate({
      id,
      flow_definition: flowDef,
    }, {
      onSuccess: () => {
        navigate("/settings/chat-flows");
      }
    });
  };

  const handleCancel = () => {
    navigate("/settings/chat-flows");
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-14 border-b flex items-center px-4 gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Fluxo não encontrado</p>
        <Button variant="link" onClick={() => navigate("/settings/chat-flows")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header fixo */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="border-l pl-3">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">{flow.name}</h1>
              <Badge variant={flow.is_active ? "default" : "secondary"} className="text-xs">
                {flow.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Editor de Fluxo Visual</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Play className="h-4 w-4 mr-2" />
            Testar
          </Button>
        </div>
      </div>
      
      {/* Editor fullscreen */}
      <div className="flex-1 overflow-hidden">
        <ChatFlowEditor
          initialFlow={flow.flow_definition as any}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={updateFlow.isPending}
        />
      </div>
    </div>
  );
}
