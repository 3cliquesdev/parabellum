import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useKnowledgeCategories } from "@/hooks/useKnowledgeCategories";

const FALLBACK_CATEGORIES = [
  "Financeiro e Pagamentos",
  "Logística e Pedidos",
  "Produtos e Serviços",
  "Conta e Acesso",
  "Técnico e Integrações",
  "Comercial e Parcerias",
];

function buildTemplateCsv(categories: string[]): string {
  const header = `\uFEFF"pergunta";"resposta";"categoria";"tags"`;
  const examples = [
    `"Como faço um saque?";"Para fazer um saque, acesse sua conta > Menu > Saques > Solicitar. O prazo é de 3-5 dias úteis.";"${categories[0] || "Financeiro e Pagamentos"}";"saque, dinheiro, pagamento"`,
    `"Qual o prazo de entrega?";"O prazo de entrega varia de 5 a 15 dias úteis, dependendo da sua região.";"${categories[1] || "Logística e Pedidos"}";"entrega, prazo, envio"`,
    `"Como rastrear meu pedido?";"Acesse Meus Pedidos > Clique no pedido > Ver Rastreamento. Você receberá atualizações por email.";"${categories[1] || "Logística e Pedidos"}";"rastreio, pedido, acompanhar"`,
    `"Como alterar minha senha?";"Acesse Configurações > Segurança > Alterar Senha. Digite a senha atual e a nova.";"${categories[3] || "Conta e Acesso"}";"senha, segurança, login"`,
  ];
  return [header, ...examples].join("\n");
}

export function KnowledgeTemplateDownload() {
  const { data: categories, isLoading } = useKnowledgeCategories();
  const validCategories = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const handleDownloadTemplate = () => {
    const csv = buildTemplateCsv(validCategories);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_conhecimento.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCategories = () => {
    const header = `\uFEFF"categoria"`;
    const rows = validCategories.map(c => `"${c}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categorias_validas.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Template de Importação
        </CardTitle>
        <CardDescription>
          Template CSV compatível com Excel (separado por ponto-e-vírgula)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Colunas principais */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
          <h4 className="font-semibold text-sm text-primary">📋 Colunas Principais (obrigatórias)</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md bg-background p-3 border">
              <p className="font-medium text-sm">pergunta</p>
              <p className="text-xs text-muted-foreground">A dúvida do cliente</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 rounded-md bg-background p-3 border">
              <p className="font-medium text-sm">resposta</p>
              <p className="text-xs text-muted-foreground">Resposta completa (min. 50 caracteres)</p>
            </div>
          </div>
        </div>

        {/* Colunas opcionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Colunas Opcionais:</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong className="text-foreground">categoria</strong> — Deve ser uma das categorias válidas abaixo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong className="text-foreground">tags</strong> — Palavras-chave (separadas por vírgula)</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Categorias Válidas ({validCategories.length}):
            </h4>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                {validCategories.map((cat) => (
                  <li key={cat} className="text-foreground">
                    • {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
          <h4 className="font-medium text-sm">💡 Dicas:</h4>
          <ul className="text-sm text-muted-foreground space-y-0.5">
            <li>• Separador: <strong>ponto-e-vírgula (;)</strong> — compatível com Excel BR</li>
            <li>• Respostas com pelo menos 50 caracteres</li>
            <li>• ⚠️ <strong>Categorias fora da lista serão bloqueadas</strong> na importação</li>
            <li>• Mínimo recomendado: 100 artigos para boa cobertura</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={handleDownloadTemplate} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Template CSV
          </Button>
          <Button onClick={handleDownloadCategories} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Lista de Categorias
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
