import { memo } from "react";
import { Clock } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { NodeProps } from "reactflow";

interface DelayNodeData {
  label: string;
  duration_days?: number;
}

export const DelayNode = memo(({ data, selected }: NodeProps<DelayNodeData>) => {
  const subtitle = data.duration_days
    ? `Aguardar ${data.duration_days} ${data.duration_days === 1 ? "dia" : "dias"}`
    : undefined;

  return (
    <WorkflowNodeWrapper
      type="delay"
      icon={Clock}
      title={data.label}
      subtitle={subtitle}
      selected={selected}
    />
  );
});

DelayNode.displayName = "DelayNode";
