import { memo } from "react";
import { NodeProps } from "reactflow";
import { Phone, CheckCircle } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AskPhoneNodeData {
  label: string;
  message: string;
  save_as: string;
  required: boolean;
  validate: boolean;
}

export const AskPhoneNode = memo(({ data, selected }: NodeProps<AskPhoneNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ask_phone"
      icon={Phone}
      title={data.label || "Perguntar Telefone"}
      subtitle={data.message || "Qual seu telefone?"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Badge variant="outline" className="text-xs">
          💾 {data.save_as || "phone"}
        </Badge>
        {data.validate !== false && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Formato BR
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskPhoneNode.displayName = "AskPhoneNode";
