import { Button } from "@/components/ui/button";
import { FlaskConical, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TestModeDropdownProps {
  isTestMode: boolean;
  toggleTestMode: (enabled: boolean) => void;
  isTestModePending: boolean;
  conversationId: string;
}

export function TestModeDropdown({
  isTestMode,
  toggleTestMode,
  isTestModePending,
}: TestModeDropdownProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isTestMode ? "default" : "outline"}
          size="sm"
          disabled={isTestModePending}
          onClick={() => toggleTestMode(!isTestMode)}
          className={cn(
            "h-7 gap-1 px-2",
            isTestMode && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
          )}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {isTestMode ? (
            <ToggleRight className="h-3.5 w-3.5" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5" />
          )}
          <span className="text-xs hidden lg:inline">
            {isTestMode ? "Teste" : "Testar"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Modo Teste: {isTestMode ? "Ativo" : "Inativo"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
