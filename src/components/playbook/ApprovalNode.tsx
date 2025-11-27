import { memo } from "react";
import { UserCheck } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { Badge } from "@/components/ui/badge";
import { NodeProps } from "reactflow";

interface ApprovalNodeData {
  label: string;
  approver_role?: "consultant" | "manager" | "admin";
  approval_message?: string;
}

const roleLabels = {
  consultant: "Consultor",
  manager: "Gerente",
  admin: "Administrador",
};

export const ApprovalNode = memo(({ data, selected }: NodeProps<ApprovalNodeData>) => {
  const subtitle = data.approver_role ? `Aprovador: ${roleLabels[data.approver_role]}` : undefined;

  return (
    <WorkflowNodeWrapper
      type="approval"
      icon={UserCheck}
      title={data.label}
      subtitle={subtitle}
      selected={selected}
    >
      <Badge variant="outline" className="text-xs">
        ⏸️ Aguarda Aprovação
      </Badge>
      {data.approval_message && (
        <p className="text-xs text-muted-foreground italic">
          "{data.approval_message}"
        </p>
      )}
    </WorkflowNodeWrapper>
  );
});

ApprovalNode.displayName = "ApprovalNode";
