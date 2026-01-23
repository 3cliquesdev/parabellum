import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  X, Send, RotateCcw, Bot, User, Phone, Mail, CreditCard, 
  Sparkles, CheckCircle2, UserPlus, MessageSquare
} from "lucide-react";
import { Node, Edge } from "reactflow";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ChatFlowSimulatorProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  flowName: string;
}

interface SimulatorMessage {
  id: string;
  type: "bot" | "user" | "system";
  content: string;
  timestamp: Date;
  options?: Array<{ id: string; label: string; value: string }>;
  inputType?: "text" | "name" | "email" | "phone" | "cpf";
  nodeId?: string;
}

interface CollectedData {
  [key: string]: string;
}

// Cores das opções (igual ao AskOptionsNode)
const optionColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ChatFlowSimulator({ open, onClose, nodes, edges, flowName }: ChatFlowSimulatorProps) {
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [currentInputType, setCurrentInputType] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Encontrar nó inicial (sem edges de entrada)
  const initialNodeId = useMemo(() => {
    const nodeIdsWithIncoming = new Set(edges.map((e) => e.target));
    // Primeiro tenta encontrar nó "start"
    const startNode = nodes.find((n) => n.id === 'start' || n.type === 'input');
    if (startNode) return startNode.id;
    // Senão, encontra nó sem incoming edges
    const firstNode = nodes.find((n) => !nodeIdsWithIncoming.has(n.id));
    return firstNode?.id || nodes[0]?.id || null;
  }, [nodes, edges]);

  // Encontrar próximo nó
  const getNextNode = useCallback((nodeId: string, sourceHandle?: string) => {
    const outgoingEdge = edges.find((e) => {
      if (e.source !== nodeId) return false;
      if (sourceHandle && e.sourceHandle !== sourceHandle) return false;
      return true;
    });
    return outgoingEdge ? nodes.find((n) => n.id === outgoingEdge.target) : null;
  }, [edges, nodes]);

  // Adicionar mensagem do bot com efeito de digitação
  const addBotMessage = useCallback((content: string, options?: SimulatorMessage['options'], inputType?: SimulatorMessage['inputType'], nodeId?: string) => {
    setIsTyping(true);
    
    // Simular tempo de digitação
    const typingTime = Math.min(Math.max(content.length * 20, 500), 1500);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now()}`,
        type: "bot",
        content,
        timestamp: new Date(),
        options,
        inputType,
        nodeId,
      }]);
      
      if (inputType || options) {
        setWaitingForInput(true);
        setCurrentInputType(inputType || 'options');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, typingTime);
  }, []);

  // Adicionar mensagem do usuário
  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      type: "user",
      content,
      timestamp: new Date(),
    }]);
    setWaitingForInput(false);
    setCurrentInputType(null);
  }, []);

  // Adicionar mensagem do sistema
  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      type: "system",
      content,
      timestamp: new Date(),
    }]);
  }, []);

  // Processar nó atual
  const processNode = useCallback((node: Node) => {
    if (!node) return;
    
    setCurrentNodeId(node.id);
    const data = node.data;

    switch (node.type) {
      case 'input': // Nó de início
        const nextFromStart = getNextNode(node.id);
        if (nextFromStart) {
          setTimeout(() => processNode(nextFromStart), 500);
        }
        break;

      case 'message':
        addBotMessage(data.message || "Olá! Como posso ajudar?");
        setTimeout(() => {
          const next = getNextNode(node.id);
          if (next) processNode(next);
        }, 2000);
        break;

      case 'ask_name':
        addBotMessage(data.message || "Qual é o seu nome?", undefined, 'name', node.id);
        break;

      case 'ask_email':
        addBotMessage(data.message || "Qual é o seu e-mail?", undefined, 'email', node.id);
        break;

      case 'ask_phone':
        addBotMessage(data.message || "Qual é o seu telefone?", undefined, 'phone', node.id);
        break;

      case 'ask_cpf':
        addBotMessage(data.message || "Qual é o seu CPF?", undefined, 'cpf', node.id);
        break;

      case 'ask_text':
        addBotMessage(data.message || "Digite sua mensagem:", undefined, 'text', node.id);
        break;

      case 'ask_options':
        const options = data.options || [];
        addBotMessage(
          data.message || "Selecione uma opção:",
          options.map((opt: any) => ({ id: opt.id, label: opt.label, value: opt.value })),
          undefined,
          node.id
        );
        break;

      case 'ai_response':
        addBotMessage(data.message || "Deixe-me verificar isso para você...");
        setTimeout(() => {
          addSystemMessage("🤖 IA processando resposta...");
          setTimeout(() => {
            addBotMessage("Esta é uma resposta simulada da IA baseada na base de conhecimento.");
            const next = getNextNode(node.id);
            if (next) setTimeout(() => processNode(next), 1500);
          }, 1500);
        }, 1000);
        break;

      case 'transfer':
        const transferTarget = data.agent_name || data.department_name || "Fila de atendimento";
        addSystemMessage(`🔄 Transferindo para: ${transferTarget}`);
        setTimeout(() => {
          addBotMessage(`Você está sendo transferido para ${transferTarget}. Em breve um atendente entrará em contato.`);
          setIsCompleted(true);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#f97316", "#22c55e", "#3b82f6"],
          });
        }, 1500);
        break;

      case 'condition':
        addSystemMessage(`⚙️ Avaliando condição: ${data.label || 'Verificação'}`);
        setTimeout(() => {
          // Simula resultado "true" por padrão
          const next = getNextNode(node.id, 'true');
          if (next) processNode(next);
        }, 1000);
        break;

      case 'end':
        addBotMessage(data.message || "Obrigado pelo contato! Até logo! 👋");
        setIsCompleted(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#8b5cf6"],
        });
        break;

      default:
        const defaultNext = getNextNode(node.id);
        if (defaultNext) processNode(defaultNext);
    }
  }, [getNextNode, addBotMessage, addSystemMessage]);

  // Iniciar simulação
  const startSimulation = useCallback(() => {
    setMessages([]);
    setCollectedData({});
    setCurrentNodeId(null);
    setIsCompleted(false);
    setInputValue("");
    setWaitingForInput(false);

    addSystemMessage("🎬 Iniciando simulação do fluxo...");
    
    setTimeout(() => {
      if (initialNodeId) {
        const startNode = nodes.find((n) => n.id === initialNodeId);
        if (startNode) processNode(startNode);
      }
    }, 800);
  }, [initialNodeId, nodes, processNode, addSystemMessage]);

  // Iniciar quando abrir
  useEffect(() => {
    if (open) {
      startSimulation();
    }
  }, [open, startSimulation]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Validação de input
  const validateInput = (value: string, type: string): boolean => {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\d\s()-]{10,}$/.test(value.replace(/\D/g, ''));
      case 'cpf':
        return /^\d{11}$/.test(value.replace(/\D/g, ''));
      default:
        return value.trim().length > 0;
    }
  };

  // Enviar resposta
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !currentNodeId || !waitingForInput) return;

    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return;

    const inputType = currentInputType || 'text';
    
    // Validar input
    if (!validateInput(inputValue, inputType)) {
      addSystemMessage(`⚠️ Por favor, insira um ${inputType === 'email' ? 'e-mail' : inputType === 'phone' ? 'telefone' : inputType === 'cpf' ? 'CPF' : 'valor'} válido.`);
      return;
    }

    // Adicionar resposta do usuário
    addUserMessage(inputValue);

    // Salvar dado coletado
    const saveAs = currentNode.data.save_as || currentNode.type?.replace('ask_', '');
    setCollectedData((prev) => ({ ...prev, [saveAs]: inputValue }));

    setInputValue("");

    // Avançar para próximo nó
    setTimeout(() => {
      const next = getNextNode(currentNodeId);
      if (next) {
        processNode(next);
      }
    }, 500);
  }, [inputValue, currentNodeId, waitingForInput, currentInputType, nodes, getNextNode, processNode, addUserMessage, addSystemMessage]);

  // Selecionar opção
  const handleSelectOption = useCallback((option: { id: string; label: string; value: string }) => {
    if (!currentNodeId) return;

    addUserMessage(option.label);

    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (currentNode) {
      const saveAs = currentNode.data.save_as || 'selected_option';
      setCollectedData((prev) => ({ ...prev, [saveAs]: option.value }));
    }

    setWaitingForInput(false);

    // Avançar para próximo nó baseado na opção selecionada
    setTimeout(() => {
      const next = getNextNode(currentNodeId, option.id);
      if (next) {
        processNode(next);
      }
    }, 500);
  }, [currentNodeId, nodes, getNextNode, processNode, addUserMessage]);

  // Placeholder dinâmico
  const getPlaceholder = () => {
    switch (currentInputType) {
      case 'name': return "Digite seu nome...";
      case 'email': return "email@exemplo.com";
      case 'phone': return "(00) 00000-0000";
      case 'cpf': return "000.000.000-00";
      default: return "Digite sua mensagem...";
    }
  };

  // Ícone do tipo de input
  const getInputIcon = () => {
    switch (currentInputType) {
      case 'email': return <Mail className="h-4 w-4 text-muted-foreground" />;
      case 'phone': return <Phone className="h-4 w-4 text-muted-foreground" />;
      case 'cpf': return <CreditCard className="h-4 w-4 text-muted-foreground" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Última mensagem com opções
  const lastOptionsMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.options && m.options.length > 0);
  }, [messages]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden h-[80vh] max-h-[700px] flex flex-col">
        {/* Header - Estilo WhatsApp */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
              <AvatarFallback className="bg-primary-foreground/20">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{flowName}</h3>
              <p className="text-xs text-primary-foreground/70">
                {isCompleted ? "Conversa finalizada" : isTyping ? "Digitando..." : "Online"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={startSimulation}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="Reiniciar simulação"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area - Background estilo chat */}
        <ScrollArea 
          ref={scrollRef} 
          className="flex-1 p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI2YwZjBmMCI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9IiNkZGQiPjwvY2lyY2xlPgo8L3N2Zz4=')] dark:bg-none dark:bg-muted/20"
        >
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex",
                    message.type === "user" ? "justify-end" : 
                    message.type === "system" ? "justify-center" : "justify-start"
                  )}
                >
                  {message.type === "system" ? (
                    <div className="bg-muted/80 backdrop-blur text-muted-foreground text-xs px-3 py-1.5 rounded-full">
                      {message.content}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                        message.type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1 text-right",
                        message.type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Options buttons (se última mensagem tem opções) */}
        {waitingForInput && lastOptionsMessage?.options && (
          <div className="p-3 border-t bg-muted/30 space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-2">Selecione uma opção:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {lastOptionsMessage.options.map((option, idx) => (
                <Button
                  key={option.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectOption(option)}
                  className="gap-2"
                  style={{ 
                    borderColor: optionColors[idx % optionColors.length],
                    color: optionColors[idx % optionColors.length]
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: optionColors[idx % optionColors.length] }}
                  />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t bg-card shrink-0">
          {isCompleted ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Simulação concluída</span>
              <Button variant="outline" size="sm" onClick={startSimulation} className="ml-2">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reiniciar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {getInputIcon()}
                </div>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  disabled={!waitingForInput || !!lastOptionsMessage?.options}
                  className="pl-10 pr-4 rounded-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
              </div>
              <Button 
                size="icon" 
                onClick={handleSendMessage}
                disabled={!waitingForInput || !inputValue.trim() || !!lastOptionsMessage?.options}
                className="rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Dados coletados (debug) */}
        {Object.keys(collectedData).length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground">Dados:</span>
              {Object.entries(collectedData).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-[10px] py-0">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
