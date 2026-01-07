import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Flame, Thermometer, Snowflake } from "lucide-react";

interface LeadScoreBadgeProps {
  score: number | null;
  classification: string | null;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

const classificationConfig = {
  quente: {
    label: "Quente",
    bgColor: "bg-green-500",
    textColor: "text-white",
    Icon: Flame,
  },
  morno: {
    label: "Morno",
    bgColor: "bg-amber-500",
    textColor: "text-white",
    Icon: Thermometer,
  },
  frio: {
    label: "Frio",
    bgColor: "bg-red-500",
    textColor: "text-white",
    Icon: Snowflake,
  },
};

export function LeadScoreBadge({ 
  score, 
  classification, 
  showScore = true,
  size = "md" 
}: LeadScoreBadgeProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const config = classification 
    ? classificationConfig[classification as keyof typeof classificationConfig] 
    : classificationConfig.frio;

  if (!config) return null;

  const { label, bgColor, textColor, Icon } = config;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div className="flex items-center gap-2">
      {showScore && (
        <span className={cn(
          "font-bold tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-lg",
        )}>
          {score}
        </span>
      )}
      <Badge 
        className={cn(
          bgColor, 
          textColor, 
          "flex items-center font-medium",
          sizeClasses[size]
        )}
      >
        <Icon className={iconSizes[size]} />
        {label}
      </Badge>
    </div>
  );
}
