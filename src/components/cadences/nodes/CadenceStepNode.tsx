import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface StepData {
  id: string;
  step_type: string;
  task_title: string;
  task_description?: string;
  day_offset: number;
  is_automated: boolean;
  message_template?: string;
  condition_type?: string;
  stepConfig: {
    label: string;
    icon: any;
    color: string;
  };
}

export const CadenceStepNode = memo(({ data, selected }: NodeProps<StepData>) => {
  const { stepConfig, step_type, task_title, day_offset, is_automated, condition_type } = data;
  const Icon = stepConfig?.icon;

  const isDelay = step_type === "delay";
  const isCondition = step_type === "condition";

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-2 !border-background !w-3 !h-3"
      />

      <Card
        className={`min-w-[220px] shadow-lg transition-all ${
          selected ? "ring-2 ring-primary ring-offset-2" : ""
        } ${isCondition ? "border-pink-400" : ""}`}
        style={{ borderColor: stepConfig?.color }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${stepConfig?.color}20` }}
            >
              {Icon && <Icon className="h-5 w-5" style={{ color: stepConfig?.color }} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{stepConfig?.label}</span>
                {is_automated && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Auto
                  </Badge>
                )}
              </div>

              {!isDelay && !isCondition && (
                <p className="text-xs text-muted-foreground truncate">
                  {task_title || "Sem título"}
                </p>
              )}

              {isDelay && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="h-3 w-3" />
                  <span>Aguardar {day_offset} dia{day_offset !== 1 ? "s" : ""}</span>
                </div>
              )}

              {isCondition && (
                <p className="text-xs text-pink-600">
                  {condition_type === "replied" && "Se respondeu →"}
                  {condition_type === "email_opened" && "Se abriu email →"}
                  {condition_type === "link_clicked" && "Se clicou no link →"}
                  {condition_type === "no_response" && "Se não respondeu →"}
                  {!condition_type && "Configurar condição..."}
                </p>
              )}

              {!isDelay && !isCondition && day_offset > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>Dia {day_offset}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-2 !border-background !w-3 !h-3"
      />

      {/* Condition node has two outputs */}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            className="!bg-red-500 !border-2 !border-background !w-3 !h-3"
            style={{ top: "70%" }}
          />
        </>
      )}
    </>
  );
});

CadenceStepNode.displayName = "CadenceStepNode";
