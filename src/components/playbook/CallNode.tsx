import { memo } from "react";
import { Phone } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { NodeProps } from "reactflow";

interface CallNodeData {
  label: string;
  description?: string;
}

export const CallNode = memo(({ data, selected }: NodeProps<CallNodeData>) => {
  return (
    <WorkflowNodeWrapper
      type="call"
      icon={Phone}
      title={data.label}
      subtitle={data.description}
      selected={selected}
    />
  );
});

CallNode.displayName = "CallNode";
