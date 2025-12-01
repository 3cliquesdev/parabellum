import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function IntegrationsConfigCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_configurations")
        .select("*")
        .eq("category", "integration")
        .order("key");
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_configurations")
        .update({ value })
        .eq("key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      toast({
        title: "Integração atualizada",
        description: "URL da Evolution API foi atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const evolutionUrl = configs?.find(c => c.key === "evolution_api_base_url")?.value || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-600" />
          Integrações Externas
        </CardTitle>
        <CardDescription>
          Configure URLs e endpoints de serviços externos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evolution-url">Evolution API - URL Base</Label>
              <div className="flex gap-2">
                <Input
                  id="evolution-url"
                  value={evolutionUrl}
                  onChange={(e) => {
                    updateConfigMutation.mutate({
                      key: "evolution_api_base_url",
                      value: e.target.value,
                    });
                  }}
                  placeholder="https://sua-evolution-api.com"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(evolutionUrl, "_blank")}
                  disabled={!evolutionUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL da sua instância Evolution API para WhatsApp multi-agente
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Mais integrações em breve (Stripe, Mercado Pago, etc.)
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
