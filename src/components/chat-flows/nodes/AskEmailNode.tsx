import { memo } from "react";
import { NodeProps } from "reactflow";
import { Mail, CheckCircle } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AskEmailNodeData {
  label: string;
  message: string;
  save_as: string;
  required: boolean;
  validate: boolean;
}

export const AskEmailNode = memo(({ data, selected }: NodeProps<AskEmailNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ask_email"
      icon={Mail}
      title={data.label || "Perguntar Email"}
      subtitle={data.message || "Qual seu email?"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Badge variant="outline" className="text-xs">
          💾 {data.save_as || "email"}
        </Badge>
        {data.validate !== false && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Validado
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskEmailNode.displayName = "AskEmailNode";
