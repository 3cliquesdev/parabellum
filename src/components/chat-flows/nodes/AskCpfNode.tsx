import { memo } from "react";
import { NodeProps } from "reactflow";
import { CreditCard, CheckCircle } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface AskCpfNodeData {
  label: string;
  message: string;
  save_as: string;
  required: boolean;
  validate: boolean;
}

export const AskCpfNode = memo(({ data, selected }: NodeProps<AskCpfNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="ask_cpf"
      icon={CreditCard}
      title={data.label || "Perguntar CPF"}
      subtitle={data.message || "Qual seu CPF?"}
      selected={selected}
    >
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Badge variant="outline" className="text-xs">
          💾 {data.save_as || "cpf"}
        </Badge>
        {data.validate !== false && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            CPF Válido
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskCpfNode.displayName = "AskCpfNode";
