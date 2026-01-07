import { memo } from "react";
import { Handle, Position } from "reactflow";
import { GitBranch, Flame, Thermometer, Snowflake } from "lucide-react";
import { WorkflowNodeWrapper } from "./WorkflowNodeWrapper";
import { Badge } from "@/components/ui/badge";
import { NodeProps } from "reactflow";

interface ConditionNodeData {
  label: string;
  condition_type?: "email_opened" | "email_clicked" | "meeting_booked" | "tag_exists" | "status_change" | "form_score" | "lead_classification";
  condition_value?: string;
  // Form score specific fields
  score_form_id?: string;
  score_form_name?: string;
  score_name?: string;
  score_operator?: "gt" | "lt" | "eq" | "gte" | "lte";
  score_threshold?: number;
  // Lead classification specific fields
  expected_classification?: "frio" | "morno" | "quente";
}

const conditionLabels: Record<string, string> = {
  email_opened: "Email Aberto",
  email_clicked: "Email Clicado",
  meeting_booked: "Reunião Agendada",
  tag_exists: "Tag Existe",
  status_change: "Mudança de Status",
  form_score: "Score do Formulário",
  lead_classification: "Classificação de Lead",
};

const operatorLabels: Record<string, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
  gte: ">=",
  lte: "<=",
};

const classificationConfig = {
  quente: { icon: Flame, label: "Quente", color: "text-green-600", bg: "bg-green-500/10" },
  morno: { icon: Thermometer, label: "Morno", color: "text-amber-600", bg: "bg-amber-500/10" },
  frio: { icon: Snowflake, label: "Frio", color: "text-red-600", bg: "bg-red-500/10" },
};

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  // Build subtitle based on condition type
  let subtitle: string | undefined;
  
  if (data.condition_type === 'lead_classification') {
    const classification = data.expected_classification || 'quente';
    const config = classificationConfig[classification];
    subtitle = `Se: Lead = ${config.label}`;
  } else if (data.condition_type === 'form_score') {
    const op = data.score_operator ? operatorLabels[data.score_operator] : '?';
    const threshold = data.score_threshold ?? '?';
    const scoreName = data.score_name || 'leadScoringTotal';
    subtitle = `Se: ${scoreName} ${op} ${threshold}`;
  } else if (data.condition_type) {
    subtitle = `Se: ${conditionLabels[data.condition_type]}`;
  }

  const ClassificationIcon = data.condition_type === 'lead_classification' && data.expected_classification
    ? classificationConfig[data.expected_classification]?.icon
    : null;

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
      {/* Lead Classification visual badge */}
      {data.condition_type === 'lead_classification' && data.expected_classification && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${classificationConfig[data.expected_classification].bg} ${classificationConfig[data.expected_classification].color}`}>
          {ClassificationIcon && <ClassificationIcon className="h-3 w-3" />}
          {classificationConfig[data.expected_classification].label}
        </div>
      )}
      
      {data.condition_type === 'form_score' && data.score_form_name && (
        <p className="text-xs text-muted-foreground italic">
          📋 {data.score_form_name}
        </p>
      )}
      
      {data.condition_type === 'lead_classification' && data.score_form_name && (
        <p className="text-xs text-muted-foreground italic">
          📋 {data.score_form_name}
        </p>
      )}
      
      {data.condition_type !== 'form_score' && data.condition_type !== 'lead_classification' && data.condition_value && (
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