import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Variable, Copy, Search } from "lucide-react";
import { useEmailVariables } from "@/hooks/useEmailBuilderV2";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  contact: "Contato",
  deal: "Negócio",
  ticket: "Ticket",
  product: "Produto",
  consultant: "Consultor",
  sales_rep: "Vendedor",
  system: "Sistema",
};

const CATEGORY_COLORS: Record<string, string> = {
  contact: "bg-blue-500/10 text-blue-600",
  deal: "bg-green-500/10 text-green-600",
  ticket: "bg-orange-500/10 text-orange-600",
  product: "bg-purple-500/10 text-purple-600",
  consultant: "bg-pink-500/10 text-pink-600",
  sales_rep: "bg-cyan-500/10 text-cyan-600",
  system: "bg-gray-500/10 text-gray-600",
};

export function VariablesPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: variables = [] } = useEmailVariables();
  const { toast } = useToast();

  const filteredVariables = variables.filter(
    (v) =>
      v.display_name.toLowerCase().includes(search.toLowerCase()) ||
      v.variable_key.toLowerCase().includes(search.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof variables>);

  const copyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast({ title: "Variável copiada!", description: `{{${key}}}` });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Variable className="h-4 w-4" />
          Variáveis
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar variáveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <ScrollArea className="h-80">
          <div className="p-2 space-y-4">
            {Object.entries(groupedVariables).map(([category, vars]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-1">
                  {vars.map((variable) => (
                    <button
                      key={variable.id}
                      onClick={() => copyVariable(variable.variable_key)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-accent text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {variable.display_name}
                          </span>
                          <Badge variant="secondary" className={`text-[10px] ${CATEGORY_COLORS[category]}`}>
                            {variable.data_type}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {`{{${variable.variable_key}}}`}
                        </code>
                      </div>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredVariables.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma variável encontrada
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
