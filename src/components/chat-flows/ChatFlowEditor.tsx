import { useCallback, useState, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowInstance,
  ReactFlowProvider,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, User, Mail, Phone, CreditCard, ListChecks, 
  MessageCircle, GitBranch, Sparkles, UserPlus, CheckCircle,
  Save, X, Trash2, Plus
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DraggableBlock } from "@/components/playbook/DraggableBlock";
import { ButtonEdge } from "@/components/playbook/ButtonEdge";
import {
  MessageNode,
  AskNameNode,
  AskEmailNode,
  AskPhoneNode,
  AskCpfNode,
  AskOptionsNode,
  AskTextNode,
  TransferNode,
  EndNode,
  AIResponseNode,
  ChatFlowConditionNode,
} from "./nodes";

// Tipos de nós para chat flows
export const chatFlowNodeTypes = {
  message: MessageNode,
  ask_name: AskNameNode,
  ask_email: AskEmailNode,
  ask_phone: AskPhoneNode,
  ask_cpf: AskCpfNode,
  ask_options: AskOptionsNode,
  ask_text: AskTextNode,
  condition: ChatFlowConditionNode,
  ai_response: AIResponseNode,
  transfer: TransferNode,
  end: EndNode,
};

const edgeTypes = {
  buttonEdge: ButtonEdge,
};

interface ChatFlowEditorProps {
  initialFlow?: { nodes: Node[]; edges: Edge[] };
  onSave: (flow: { nodes: Node[]; edges: Edge[] }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

function ChatFlowEditorInner({ initialFlow, onSave, onCancel, isSaving }: ChatFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'buttonEdge',
      style: { strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
    }, eds)),
    [setEdges]
  );

  const defaultEdgeOptions = {
    type: 'buttonEdge',
    style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    animated: false,
  };

  const getDefaultData = (type: string) => {
    const defaults: Record<string, any> = {
      message: { label: "Mensagem", message: "" },
      ask_name: { label: "Perguntar Nome", message: "Qual seu nome completo?", save_as: "name", required: true },
      ask_email: { label: "Perguntar Email", message: "Qual seu email?", save_as: "email", required: true, validate: true },
      ask_phone: { label: "Perguntar Telefone", message: "Qual seu telefone?", save_as: "phone", required: true, validate: true },
      ask_cpf: { label: "Perguntar CPF", message: "Qual seu CPF?", save_as: "cpf", required: true, validate: true },
      ask_options: { label: "Múltipla Escolha", message: "Selecione uma opção:", save_as: "choice", options: [] },
      ask_text: { label: "Pergunta Aberta", message: "Digite sua resposta:", save_as: "response", required: false },
      condition: { label: "Condição", condition_type: "contains", condition_field: "", condition_value: "" },
      ai_response: { label: "Resposta IA", context_prompt: "", use_knowledge_base: true, fallback_message: "" },
      transfer: { label: "Transferir", message: "Transferindo para atendimento humano...", transfer_type: "department" },
      end: { label: "Fim", message: "Obrigado pelo contato!", end_action: "none" },
    };
    return defaults[type] || { label: `Novo ${type}` };
  };

  const addNode = (type: string, position?: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: position || { x: Math.random() * 400, y: Math.random() * 300 },
      data: getDefaultData(type),
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      addNode(type, position);
    },
    [reactFlowInstance]
  );

  const updateNodeData = (field: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
    setSelectedNode({
      ...selectedNode,
      data: { ...selectedNode.data, [field]: value }
    });
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter(
      (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
    ));
    setSelectedNode(null);
  };

  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error("Adicione pelo menos um bloco ao fluxo");
      return;
    }
    onSave({ nodes, edges });
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Adicionar/remover opções para ask_options
  const addOption = () => {
    if (!selectedNode) return;
    const options = selectedNode.data.options || [];
    const newOption = { id: `opt_${Date.now()}`, label: "", value: "" };
    updateNodeData('options', [...options, newOption]);
  };

  const removeOption = (idx: number) => {
    if (!selectedNode) return;
    const options = [...(selectedNode.data.options || [])];
    options.splice(idx, 1);
    updateNodeData('options', options);
  };

  const updateOption = (idx: number, field: string, value: string) => {
    if (!selectedNode) return;
    const options = [...(selectedNode.data.options || [])];
    options[idx] = { ...options[idx], [field]: value };
    updateNodeData('options', options);
  };

  return (
    <div className="flex h-[600px] gap-4">
      {/* Sidebar */}
      <Card className="w-72 p-4 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              💬 Blocos de Chat
            </h3>
            <p className="text-xs text-muted-foreground">Arraste e solte no canvas</p>
            
            <div className="grid grid-cols-2 gap-2">
              <DraggableBlock type="message" icon={MessageSquare} label="Mensagem" />
              <DraggableBlock type="ask_name" icon={User} label="Nome" />
              <DraggableBlock type="ask_email" icon={Mail} label="Email" />
              <DraggableBlock type="ask_phone" icon={Phone} label="Telefone" />
              <DraggableBlock type="ask_cpf" icon={CreditCard} label="CPF" />
              <DraggableBlock type="ask_options" icon={ListChecks} label="Opções" />
              <DraggableBlock type="ask_text" icon={MessageCircle} label="Texto" />
              <DraggableBlock type="condition" icon={GitBranch} label="Condição" />
              <DraggableBlock type="ai_response" icon={Sparkles} label="IA" />
              <DraggableBlock type="transfer" icon={UserPlus} label="Transferir" />
              <DraggableBlock type="end" icon={CheckCircle} label="Fim" />
            </div>

            {/* Painel de propriedades */}
            {selectedNode && (
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Propriedades</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={deleteNode}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Nome do bloco */}
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={selectedNode.data.label || ""}
                    onChange={(e) => updateNodeData("label", e.target.value)}
                  />
                </div>

                {/* Mensagem (para a maioria dos nós) */}
                {["message", "ask_name", "ask_email", "ask_phone", "ask_cpf", "ask_options", "ask_text", "transfer", "end"].includes(selectedNode.type || "") && (
                  <div>
                    <Label>Mensagem</Label>
                    <Textarea
                      value={selectedNode.data.message || ""}
                      onChange={(e) => updateNodeData("message", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {/* save_as para campos de coleta */}
                {["ask_name", "ask_email", "ask_phone", "ask_cpf", "ask_text", "ask_options"].includes(selectedNode.type || "") && (
                  <div>
                    <Label>Salvar como</Label>
                    <Input
                      value={selectedNode.data.save_as || ""}
                      onChange={(e) => updateNodeData("save_as", e.target.value)}
                      placeholder="nome_variavel"
                    />
                  </div>
                )}

                {/* Validação toggle */}
                {["ask_email", "ask_phone", "ask_cpf"].includes(selectedNode.type || "") && (
                  <div className="flex items-center justify-between">
                    <Label>Validar formato</Label>
                    <Switch
                      checked={selectedNode.data.validate !== false}
                      onCheckedChange={(checked) => updateNodeData("validate", checked)}
                    />
                  </div>
                )}

                {/* Opções para ask_options */}
                {selectedNode.type === "ask_options" && (
                  <div className="space-y-2">
                    <Label>Opções</Label>
                    {(selectedNode.data.options || []).map((opt: any, idx: number) => (
                      <div key={opt.id} className="flex gap-2">
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(idx, "label", e.target.value)}
                          placeholder="Rótulo"
                          className="flex-1"
                        />
                        <Input
                          value={opt.value}
                          onChange={(e) => updateOption(idx, "value", e.target.value)}
                          placeholder="Valor"
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeOption(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar opção
                    </Button>
                  </div>
                )}

                {/* Condição */}
                {selectedNode.type === "condition" && (
                  <>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={selectedNode.data.condition_type || "contains"}
                        onValueChange={(v) => updateNodeData("condition_type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="equals">É igual a</SelectItem>
                          <SelectItem value="has_data">Tem dado</SelectItem>
                          <SelectItem value="regex">Regex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Campo</Label>
                      <Input
                        value={selectedNode.data.condition_field || ""}
                        onChange={(e) => updateNodeData("condition_field", e.target.value)}
                        placeholder="nome_variavel"
                      />
                    </div>
                    {selectedNode.data.condition_type !== "has_data" && (
                      <div>
                        <Label>Valor</Label>
                        <Input
                          value={selectedNode.data.condition_value || ""}
                          onChange={(e) => updateNodeData("condition_value", e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* IA Response */}
                {selectedNode.type === "ai_response" && (
                  <>
                    <div>
                      <Label>Contexto para IA</Label>
                      <Textarea
                        value={selectedNode.data.context_prompt || ""}
                        onChange={(e) => updateNodeData("context_prompt", e.target.value)}
                        placeholder="Instruções adicionais para a IA..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Usar base de conhecimento</Label>
                      <Switch
                        checked={selectedNode.data.use_knowledge_base !== false}
                        onCheckedChange={(checked) => updateNodeData("use_knowledge_base", checked)}
                      />
                    </div>
                  </>
                )}

                {/* Transfer */}
                {selectedNode.type === "transfer" && (
                  <div>
                    <Label>Tipo de transferência</Label>
                    <Select
                      value={selectedNode.data.transfer_type || "department"}
                      onValueChange={(v) => updateNodeData("transfer_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">Departamento</SelectItem>
                        <SelectItem value="queue">Fila de atendimento</SelectItem>
                        <SelectItem value="agent">Agente específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* End action */}
                {selectedNode.type === "end" && (
                  <div>
                    <Label>Ação final</Label>
                    <Select
                      value={selectedNode.data.end_action || "none"}
                      onValueChange={(v) => updateNodeData("end_action", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Apenas finalizar</SelectItem>
                        <SelectItem value="create_lead">Criar lead</SelectItem>
                        <SelectItem value="create_ticket">Criar ticket</SelectItem>
                        <SelectItem value="add_tag">Adicionar tag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 border rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={chatFlowNodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          className="bg-background"
        >
          <Background 
            variant={BackgroundVariant.Dots}
            gap={20} 
            size={1}
            className="opacity-30"
          />
          <Controls 
            className="!bg-card !border !shadow-lg !rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                message: '#64748b',
                ask_name: '#2563eb',
                ask_email: '#0891b2',
                ask_phone: '#16a34a',
                ask_cpf: '#d97706',
                ask_options: '#7c3aed',
                ask_text: '#4f46e5',
                condition: '#9333ea',
                ai_response: '#db2777',
                transfer: '#ea580c',
                end: '#059669',
              };
              return colors[node.type || ''] || 'hsl(var(--primary))';
            }}
            maskColor="hsl(var(--background) / 0.2)"
            className="!bg-card !border !rounded-lg !shadow-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function ChatFlowEditor(props: ChatFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <ChatFlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
