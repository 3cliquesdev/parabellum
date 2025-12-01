import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Secret {
  name: string;
  description: string;
  usedIn: string;
}

const KNOWN_SECRETS: Secret[] = [
  { name: "RESEND_API_KEY", description: "Envio de emails", usedIn: "18 funções" },
  { name: "OPENAI_API_KEY", description: "Inteligência Artificial", usedIn: "11 funções" },
  { name: "EVOLUTION_API_SECRET", description: "WhatsApp Webhook", usedIn: "1 função" },
  { name: "KIWIFY_WEBHOOK_SECRET", description: "Kiwify Webhook", usedIn: "1 função" },
  { name: "RESEND_WEBHOOK_SECRET", description: "Email Webhook", usedIn: "1 função" },
  { name: "AUDIT_EMAIL", description: "Alertas de sistema", usedIn: "Notificações" },
];

export default function SecretsConfigCard() {
  const { toast } = useToast();

  // Fetch configured secrets from Supabase
  const { data: configuredSecrets, isLoading } = useQuery({
    queryKey: ["configured-secrets"],
    queryFn: async () => {
      // This would need a backend function to check which secrets exist
      // For now, we'll simulate it
      return KNOWN_SECRETS.map(s => s.name);
    },
  });

  const handleUpdateSecret = (secretName: string) => {
    toast({
      title: "Atualizar Secret",
      description: `Para atualizar ${secretName}, use a ferramenta de secrets do Lovable Cloud`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          API Keys & Secrets
        </CardTitle>
        <CardDescription>
          Gerencie chaves de API e secrets do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {KNOWN_SECRETS.map((secret) => {
              const isConfigured = configuredSecrets?.includes(secret.name);
              
              return (
                <div
                  key={secret.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isConfigured ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{secret.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{secret.description}</span>
                        <span>•</span>
                        <span>{secret.usedIn}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateSecret(secret.name)}
                  >
                    {isConfigured ? "Atualizar" : "Configurar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Secrets são gerenciados de forma segura pelo Lovable Cloud e não são exibidos aqui
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
