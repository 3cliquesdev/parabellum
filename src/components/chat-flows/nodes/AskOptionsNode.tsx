import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { ListChecks } from "lucide-react";
import { ChatFlowNodeWrapper } from "../ChatFlowNodeWrapper";
import { Badge } from "@/components/ui/badge";

interface Option {
  id: string;
  label: string;
  value: string;
}

interface AskOptionsNodeData {
  label: string;
  message: string;
  options: Option[];
  save_as: string;
  allow_multiple: boolean;
}

export const AskOptionsNode = memo(({ data, selected }: NodeProps<AskOptionsNodeData>) => {
  const options = data.options || [];
  
  return (
    <ChatFlowNodeWrapper
      type="ask_options"
      icon={ListChecks}
      title={data.label || "Múltipla Escolha"}
      subtitle={data.message || "Selecione uma opção"}
      selected={selected}
      showSourceHandle={false}
      customHandles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="!w-4 !h-4 !bg-primary !border-2 !border-background"
          />
          {/* Handle para cada opção */}
          {options.map((option, idx) => (
            <Handle
              key={option.id}
              type="source"
              position={Position.Right}
              id={option.id}
              className="!w-3 !h-3 !border-2 !border-background"
              style={{ 
                background: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
                top: `${25 + (idx * 50 / Math.max(options.length - 1, 1))}%`
              }}
            />
          ))}
          {/* Fallback handle se não houver opções */}
          {options.length === 0 && (
            <Handle
              type="source"
              position={Position.Right}
              className="!w-4 !h-4 !bg-primary !border-2 !border-background"
            />
          )}
        </>
      }
    >
      <div className="space-y-1">
        {options.slice(0, 3).map((option, idx) => (
          <Badge 
            key={option.id} 
            variant="outline" 
            className="text-xs mr-1"
            style={{ borderColor: `hsl(${(idx * 60) % 360}, 70%, 50%)` }}
          >
            {option.label}
          </Badge>
        ))}
        {options.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{options.length - 3} mais
          </Badge>
        )}
        {options.length === 0 && (
          <Badge variant="destructive" className="text-xs">
            Sem opções configuradas
          </Badge>
        )}
      </div>
    </ChatFlowNodeWrapper>
  );
});

AskOptionsNode.displayName = "AskOptionsNode";
