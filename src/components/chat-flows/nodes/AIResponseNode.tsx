import { memo } from "react";
import { NodeProps } from "reactflow";
import { Sparkles, Brain } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AIResponseNodeData {
  label: string;
  context_prompt?: string;
  use_knowledge_base: boolean;
  fallback_message?: string;
}

export const AIResponseNode = memo(({ data, selected }: NodeProps<AIResponseNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ai_response"
      icon={Sparkles}
      title={data.label || "Resposta IA"}
      subtitle={data.context_prompt ? `Contexto: ${data.context_prompt.slice(0, 40)}...` : "Usar IA para responder"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {data.use_knowledge_base !== false && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Usa KB
          </Badge>
        )}
        {data.fallback_message && (
          <Badge variant="outline" className="text-xs">
            Com fallback
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AIResponseNode.displayName = "AIResponseNode";
