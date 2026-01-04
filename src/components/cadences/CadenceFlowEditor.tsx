import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Clock, Linkedin, MessageSquare, Phone, CheckSquare, GitBranch, MessageCircle } from "lucide-react";
import { CadenceStepNode } from "./nodes/CadenceStepNode";
import { CadenceStepPanel } from "./CadenceStepPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const nodeTypes = {
  cadenceStep: CadenceStepNode,
};

interface CadenceFlowEditorProps {
  cadenceId: string;
  steps: any[];
  onStepsChange: () => void;
}

const stepTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  email: { label: "Email", icon: Mail, color: "#3B82F6" },
  delay: { label: "Delay", icon: Clock, color: "#F59E0B" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "#0077B5" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "#25D366" },
  sms: { label: "SMS", icon: MessageCircle, color: "#8B5CF6" },
  call: { label: "Ligação", icon: Phone, color: "#EF4444" },
  task: { label: "Tarefa", icon: CheckSquare, color: "#10B981" },
  condition: { label: "Condição IF", icon: GitBranch, color: "#EC4899" },
};

export function CadenceFlowEditor({ cadenceId, steps, onStepsChange }: CadenceFlowEditorProps) {
  const { toast } = useToast();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Convert steps to nodes
  const initialNodes: Node[] = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      type: "cadenceStep",
      position: { x: step.position_x || 400, y: step.position_y || 100 + index * 150 },
      data: {
        ...step,
        stepConfig: stepTypeConfig[step.step_type] || stepTypeConfig.task,
      },
    }));
  }, [steps]);

  // Create edges between consecutive steps
  const initialEdges: Edge[] = useMemo(() => {
    const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
    return sortedSteps.slice(0, -1).map((step, index) => ({
      id: `e-${step.id}-${sortedSteps[index + 1].id}`,
      source: step.id,
      target: sortedSteps[index + 1].id,
      type: "smoothstep",
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    }));
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleAddStep = async (stepType: string) => {
    const maxPosition = Math.max(...steps.map(s => s.position), -1);
    const maxY = Math.max(...steps.map(s => s.position_y || 0), 0);

    const newStep = {
      cadence_id: cadenceId,
      step_type: stepType,
      position: maxPosition + 1,
      day_offset: stepType === "delay" ? 1 : 0,
      task_title: stepTypeConfig[stepType]?.label || "Novo Passo",
      is_automated: stepType === "email" || stepType === "delay",
      position_x: 400,
      position_y: maxY + 150,
    };

    const { error } = await supabase.from("cadence_steps").insert(newStep);
    
    if (error) {
      toast({ variant: "destructive", title: "Erro ao adicionar passo", description: error.message });
      return;
    }

    onStepsChange();
    toast({ title: `Passo "${stepTypeConfig[stepType]?.label}" adicionado!` });
  };

  const handleUpdateStep = async (stepId: string, updates: any) => {
    const { error } = await supabase
      .from("cadence_steps")
      .update(updates)
      .eq("id", stepId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar passo", description: error.message });
      return;
    }

    onStepsChange();
    setSelectedNode(null);
    toast({ title: "Passo atualizado!" });
  };

  const handleDeleteStep = async (stepId: string) => {
    const { error } = await supabase
      .from("cadence_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao deletar passo", description: error.message });
      return;
    }

    onStepsChange();
    setSelectedNode(null);
    toast({ title: "Passo removido!" });
  };

  // Update node positions when dragging
  const onNodeDragStop = useCallback(async (_: React.MouseEvent, node: Node) => {
    await supabase
      .from("cadence_steps")
      .update({ position_x: node.position.x, position_y: node.position.y })
      .eq("id", node.id);
  }, []);

  return (
    <div className="flex h-full">
      {/* Flow Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/30"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => node.data?.stepConfig?.color || "#888"} 
            className="!bg-card !border-border"
          />

          {/* Add Step Panel */}
          <Panel position="top-left" className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 shadow-lg">
                  <Plus className="h-4 w-4" />
                  Adicionar Passo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Comunicação</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAddStep("email")} className="gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("linkedin")} className="gap-2">
                  <Linkedin className="h-4 w-4 text-[#0077B5]" />
                  LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("whatsapp")} className="gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("sms")} className="gap-2">
                  <MessageCircle className="h-4 w-4 text-purple-500" />
                  SMS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("call")} className="gap-2">
                  <Phone className="h-4 w-4 text-red-500" />
                  Ligação
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Controle</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAddStep("delay")} className="gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Delay (Aguardar)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("task")} className="gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  Tarefa Manual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddStep("condition")} className="gap-2">
                  <GitBranch className="h-4 w-4 text-pink-500" />
                  Condição IF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Panel>

          {/* Stats Panel */}
          <Panel position="top-right" className="bg-card border rounded-lg p-3 shadow-lg">
            <div className="text-sm space-y-1">
              <div className="font-medium">{steps.length} passos</div>
              <div className="text-muted-foreground text-xs">
                {steps.reduce((acc, s) => acc + (s.day_offset || 0), 0)} dias total
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Step Properties Panel */}
      {selectedNode && (
        <CadenceStepPanel
          step={selectedNode.data}
          stepConfig={stepTypeConfig}
          onUpdate={(updates) => handleUpdateStep(selectedNode.id, updates)}
          onDelete={() => handleDeleteStep(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
