import { memo } from "react";
import { Handle, Position } from "reactflow";
import { GitBranch } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { Badge } from "@/components/ui/badge";
import { NodeProps } from "reactflow";

interface ConditionNodeData {
  label: string;
  condition_type?: "email_opened" | "email_clicked" | "meeting_booked" | "tag_exists" | "status_change";
  condition_value?: string;
}

const conditionLabels = {
  email_opened: "Email Aberto",
  email_clicked: "Email Clicado",
  meeting_booked: "Reunião Agendada",
  tag_exists: "Tag Existe",
  status_change: "Mudança de Status",
};

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  const subtitle = data.condition_type ? `Se: ${conditionLabels[data.condition_type]}` : undefined;

  return (
    <WorkflowNodeWrapper
      type="condition"
      icon={GitBranch}
      title={data.label}
      subtitle={subtitle}
      selected={selected}
      showSourceHandle={false}
      customHandles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="!w-4 !h-4 !bg-primary !border-2 !border-background"
          />
          {/* Handle direito superior para o caminho "true" (Sim) */}
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-4 !h-4 !border-2 !border-background"
            style={{ background: '#16a34a', top: '35%' }}
          />
          {/* Handle direito inferior para o caminho "false" (Não) */}
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-4 !h-4 !border-2 !border-background"
            style={{ background: '#dc2626', top: '65%' }}
          />
        </>
      }
    >
      {data.condition_value && (
        <p className="text-xs text-muted-foreground italic">
          "{data.condition_value}"
        </p>
      )}
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">
          ✓ Sim
        </Badge>
        <Badge variant="outline" className="text-xs">
          ✗ Não
        </Badge>
      </div>
    </WorkflowNodeWrapper>
  );
});

ConditionNode.displayName = "ConditionNode";
