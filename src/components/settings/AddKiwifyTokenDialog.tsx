import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface AddKiwifyTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddKiwifyTokenDialog({ open, onOpenChange }: AddKiwifyTokenDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  const addTokenMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("kiwify_webhook_tokens")
        .insert({
          name: name.trim(),
          token: token.trim(),
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kiwify-tokens"] });
      toast({
        title: "✅ Token adicionado!",
        description: `Token "${name}" cadastrado com sucesso`,
      });
      setName("");
      setToken("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar token",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !token.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o token",
        variant: "destructive",
      });
      return;
    }

    addTokenMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Token Kiwify</DialogTitle>
          <DialogDescription>
            Adicione um novo token/secret gerado pela Kiwify para validar webhooks
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">Nome do Token</Label>
            <Input
              id="token-name"
              placeholder="Ex: Produto Mentoria Elite"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={addTokenMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Identificação para facilitar gerenciamento
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-value">Token / Secret</Label>
            <Input
              id="token-value"
              type="password"
              placeholder="vky..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={addTokenMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Copie o Secret gerado ao criar o webhook na Kiwify
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addTokenMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={addTokenMutation.isPending}
            >
              {addTokenMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Adicionar Token
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
