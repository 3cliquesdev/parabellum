import { memo } from "react";
import { NodeProps } from "reactflow";
import { MessageCircle } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AskTextNodeData {
  label: string;
  message: string;
  save_as: string;
  required: boolean;
  min_length?: number;
  max_length?: number;
}

export const AskTextNode = memo(({ data, selected }: NodeProps<AskTextNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ask_text"
      icon={MessageCircle}
      title={data.label || "Pergunta Aberta"}
      subtitle={data.message || "Digite sua resposta"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Badge variant="outline" className="text-xs">
          💾 {data.save_as || "response"}
        </Badge>
        {data.min_length && (
          <Badge variant="secondary" className="text-xs">
            Min: {data.min_length}
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskTextNode.displayName = "AskTextNode";
