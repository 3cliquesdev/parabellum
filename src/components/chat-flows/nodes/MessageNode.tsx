import { memo } from "react";
import { NodeProps } from "reactflow";
import { MessageSquare } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";

interface MessageNodeData {
  label: string;
  message: string;
}

export const MessageNode = memo(({ data, selected }: NodeProps<MessageNodeData>) => {
  return (
    <ChatFlowNodeWrapper
      type="message"
      icon={MessageSquare}
      title={data.label || "Mensagem"}
      subtitle={data.message ? `"${data.message.slice(0, 50)}${data.message.length > 50 ? '...' : ''}"` : "Sem mensagem"}
      selected={selected}
    />
  );
});

MessageNode.displayName = "MessageNode";
