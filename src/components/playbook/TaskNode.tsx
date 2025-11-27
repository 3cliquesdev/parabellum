import { memo } from "react";
import { CheckSquare } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { NodeProps } from "reactflow";

interface TaskNodeData {
  label: string;
  task_type?: string;
  description?: string;
}

export const TaskNode = memo(({ data, selected }: NodeProps<TaskNodeData>) => {
  return (
    <WorkflowNodeWrapper
      type="task"
      icon={CheckSquare}
      title={data.label}
      subtitle={data.description}
      selected={selected}
    />
  );
});

TaskNode.displayName = "TaskNode";
