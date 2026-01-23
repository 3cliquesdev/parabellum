import { memo } from "react";
import { NodeProps } from "reactflow";
import { User } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AskNameNodeData {
  label: string;
  message: string;
  save_as: string;
  required: boolean;
}

export const AskNameNode = memo(({ data, selected }: NodeProps<AskNameNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ask_name"
      icon={User}
      title={data.label || "Perguntar Nome"}
      subtitle={data.message || "Qual seu nome completo?"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs">
          💾 {data.save_as || "name"}
        </Badge>
        {data.required && (
          <Badge variant="secondary" className="text-xs">
            Obrigatório
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskNameNode.displayName = "AskNameNode";
