import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useScoringConfig, useUpdateScoringConfig, ScoringRule } from "@/hooks/useScoringConfig";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ScoringFieldsConfig() {
  const { data: configs, isLoading } = useScoringConfig();
  const updateConfig = useUpdateScoringConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRules, setEditedRules] = useState<ScoringRule[]>([]);
  const [openFields, setOpenFields] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleEdit = (configId: string, rules: ScoringRule[]) => {
    setEditingId(configId);
    setEditedRules([...rules]);
    setOpenFields(prev => new Set(prev).add(configId));
  };

  const handleSave = async (configId: string) => {
    await updateConfig.mutateAsync({
      id: configId,
      updates: { value_rules: editedRules as any },
    });
    setEditingId(null);
  };

  const handleRuleChange = (index: number, field: keyof ScoringRule, value: any) => {
    const newRules = [...editedRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setEditedRules(newRules);
  };

  const toggleField = (id: string) => {
    setOpenFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleActive = async (configId: string, isActive: boolean) => {
    await updateConfig.mutateAsync({
      id: configId,
      updates: { is_active: isActive },
    });
  };

  const isRangeRule = (rule: ScoringRule) => rule.min !== undefined;

  return (
    <div className="space-y-4">
      {configs?.map((config) => (
        <Card key={config.id}>
          <Collapsible 
            open={openFields.has(config.id)}
            onOpenChange={() => toggleField(config.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                    {openFields.has(config.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <CardTitle className="text-base">{config.field_label}</CardTitle>
                  </button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {config.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <CardDescription className="text-xs">
                Campo: <code className="bg-muted px-1 rounded">{config.field_name}</code>
              </CardDescription>
            </CardHeader>

            <CollapsibleContent>
              <CardContent>
                {editingId === config.id ? (
                  <div className="space-y-3">
                    {editedRules.map((rule, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        {isRangeRule(rule) ? (
                          <>
                            <div className="flex items-center gap-2 flex-1">
                              <Label className="text-xs whitespace-nowrap">De</Label>
                              <Input
                                type="number"
                                value={rule.min}
                                onChange={(e) => handleRuleChange(index, "min", parseInt(e.target.value))}
                                className="w-16 h-8"
                              />
                              <Label className="text-xs whitespace-nowrap">até</Label>
                              <Input
                                type="number"
                                value={rule.max}
                                onChange={(e) => handleRuleChange(index, "max", parseInt(e.target.value))}
                                className="w-16 h-8"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="flex-1">
                            <Badge variant="outline" className="text-xs">
                              {rule.label}
                            </Badge>
                            <code className="ml-2 text-xs text-muted-foreground">
                              {rule.value}
                            </code>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">=</Label>
                          <Input
                            type="number"
                            value={rule.points}
                            onChange={(e) => handleRuleChange(index, "points", parseInt(e.target.value))}
                            className="w-16 h-8"
                          />
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(config.id)}
                        disabled={updateConfig.isPending}
                      >
                        {updateConfig.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {config.value_rules.map((rule, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          !config.is_active && "opacity-50"
                        )}
                      >
                        <span className="text-muted-foreground">
                          {isRangeRule(rule) 
                            ? `${rule.min} - ${rule.max}` 
                            : rule.label
                          }
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "tabular-nums",
                            rule.points > 5 && "bg-green-500/20 text-green-700",
                            rule.points > 0 && rule.points <= 5 && "bg-amber-500/20 text-amber-700",
                            rule.points === 0 && "bg-muted"
                          )}
                        >
                          {rule.points} pts
                        </Badge>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleEdit(config.id, config.value_rules)}
                    >
                      Editar Pontuação
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
