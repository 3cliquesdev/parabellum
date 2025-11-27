import { memo } from "react";
import { Mail } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { NodeProps } from "reactflow";

interface EmailNodeData {
  label: string;
  subject?: string;
  template_id?: string;
}

export const EmailNode = memo(({ data, selected }: NodeProps<EmailNodeData>) => {
  return (
    <WorkflowNodeWrapper
      type="email"
      icon={Mail}
      title={data.label}
      subtitle={data.subject ? `Assunto: ${data.subject}` : undefined}
      selected={selected}
    />
  );
});

EmailNode.displayName = "EmailNode";
