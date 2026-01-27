import { Node } from "reactflow";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database, 
  BookOpen, 
  ShoppingCart, 
  Package,
  Info
} from "lucide-react";
import { useKnowledgeCategories } from "@/hooks/useKnowledgeCategories";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RAGSourcesSectionProps {
  selectedNode: Node;
  updateNodeData: (field: string, value: any) => void;
}

export function RAGSourcesSection({
  selectedNode,
  updateNodeData,
}: RAGSourcesSectionProps) {
  const { data: kbCategories, isLoading: loadingCategories } = useKnowledgeCategories();
  
  const selectedCategories: string[] = selectedNode.data.kb_categories || [];
  
  const handleCategoryToggle = (category: string) => {
    const current = selectedNode.data.kb_categories || [];
    const newCategories = current.includes(category)
      ? current.filter((c: string) => c !== category)
      : [...current, category];
    updateNodeData("kb_categories", newCategories);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <Label className="text-xs font-semibold uppercase tracking-wide">
          Fontes de Dados (RAG)
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                O RAG (Retrieval-Augmented Generation) busca informações dessas fontes 
                para enriquecer as respostas da IA e evitar alucinações.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Base de Conhecimento */}
      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">Base de Conhecimento</Label>
          </div>
          <Switch
            checked={selectedNode.data.use_knowledge_base !== false}
            onCheckedChange={(checked) => updateNodeData("use_knowledge_base", checked)}
          />
        </div>

        {selectedNode.data.use_knowledge_base !== false && (
          <div className="space-y-2 pt-2">
            <Label className="text-[11px] text-muted-foreground">
              Filtrar por categorias (vazio = todas):
            </Label>
            
            {loadingCategories ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : kbCategories && kbCategories.length > 0 ? (
              <ScrollArea className="max-h-28">
                <div className="space-y-1 pr-2">
                  {kbCategories.map((category) => (
                    <label
                      key={category}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate">{category}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">
                Nenhuma categoria na KB
              </p>
            )}

            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedCategories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="text-[10px] px-1.5 cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleCategoryToggle(cat)}
                  >
                    {cat} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dados do Cliente (Kiwify/CRM) */}
      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-500" />
            <Label className="text-sm font-medium">Dados do Cliente (CRM)</Label>
          </div>
          <Switch
            checked={selectedNode.data.use_customer_data === true}
            onCheckedChange={(checked) => updateNodeData("use_customer_data", checked)}
          />
        </div>

        {selectedNode.data.use_customer_data && (
          <div className="space-y-1.5 pt-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
              <Checkbox
                checked={selectedNode.data.use_order_history === true}
                onCheckedChange={(checked) => updateNodeData("use_order_history", checked)}
                className="h-3.5 w-3.5"
              />
              <span>Consultar histórico de pedidos</span>
            </label>
            <p className="text-[10px] text-muted-foreground px-2">
              A IA terá acesso a pedidos, status e dados de compra do cliente
            </p>
          </div>
        )}
      </div>

      {/* Rastreio Logístico */}
      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <Label className="text-sm font-medium">Rastreio de Pedidos</Label>
          </div>
          <Switch
            checked={selectedNode.data.use_tracking === true}
            onCheckedChange={(checked) => updateNodeData("use_tracking", checked)}
          />
        </div>

        {selectedNode.data.use_tracking && (
          <p className="text-[10px] text-muted-foreground px-2 pt-1">
            A IA consultará status de envio e código de rastreio automaticamente
          </p>
        )}
      </div>
    </div>
  );
}
