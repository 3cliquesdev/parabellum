import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Setup() {
  const [email, setEmail] = useState("ronildo@liberty.com");
  const [password, setPassword] = useState("04692021Rt!");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-first-admin', {
        body: { email, password }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Admin criado com sucesso!",
          description: "Você já pode fazer login no sistema.",
        });
        
        // Aguarda 2 segundos e redireciona para login
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Setup Inicial - CRM Liberty</CardTitle>
          <CardDescription className="text-center">
            Crie o primeiro usuário administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Admin</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando Admin..." : "Criar Primeiro Admin"}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Esta página só funcionará se nenhum usuário existir ainda
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
