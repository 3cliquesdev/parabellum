import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink, MessageSquare, Phone } from "lucide-react";

export default function ChatLinksSettings() {
  const { toast } = useToast();

  const baseUrl = window.location.origin;

  // Buscar instância WhatsApp conectada
  const { data: whatsappInstances } = useQuery({
    queryKey: ['whatsapp-instances-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('phone_number, name')
        .eq('status', 'connected')
        .limit(1);
      return data;
    }
  });

  const whatsappInstance = whatsappInstances?.[0];
  // phone_number vem no formato "5511999999999@s.whatsapp.net" - extrair só o número
  const whatsappNumber = whatsappInstance?.phone_number?.replace('@s.whatsapp.net', '');

  const chatLink = `${baseUrl}/public-chat?dept=comercial`;
  const whatsappMessage = encodeURIComponent(
    "Olá, vim pelo site e gostaria de atendimento"
  );
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : null;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const openPortal = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Links Públicos</h1>
        <p className="text-muted-foreground">
          Links para compartilhar com clientes e leads
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Chat ao Vivo
            </CardTitle>
            <CardDescription>Link direto para o chat online</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                {chatLink}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyLink(chatLink)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPortal(chatLink)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              WhatsApp
            </CardTitle>
            <CardDescription>Link direto para WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            {whatsappLink ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                  {whatsappLink}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(whatsappLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openPortal(whatsappLink)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma instância WhatsApp conectada. Configure em Configurações → WhatsApp.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
