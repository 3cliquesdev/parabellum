import { NextRequest, NextResponse } from "next/server";
import { assertTenantAdmin } from "@/lib/auth/guard";

export const maxDuration = 60;

type Article = { titulo: string; conteudo: string; categoria: string; tags: string[] };

const articles: Article[] = [
  {
    titulo: "VIGENTE — Seu Armazém Drop: planos, benefícios e pagamentos",
    categoria: "Preços",
    tags: ["sabr", "seu armazém drop", "planos", "preços", "vigente"],
    conteudo: `O Seu Armazém Drop é uma estrutura para iniciar ou expandir dropshipping nacional. Todos os planos incluem: catálogo com mais de 1.000 produtos validados; fornecedor exclusivo; sistemas próprios de pedidos, pagamentos e etiquetas; gerenciamento de envios feito pela 3 Cliques; aulas ao vivo semanais; área de membros para iniciantes; Calculadora Pro; Creative Pro; SEO Master; suporte de especialista via WhatsApp; possibilidade de reservar estoque; 50 anúncios publicados na Shopee em até 7 dias úteis; garantia incondicional de 7 dias. Nunca garantir vendas, lucro, faturamento ou posicionamento em marketplace.

PLANO MENSAL SABR — R$ 197 por mês, cancelável a qualquer momento. Indicado para quem começa do zero, quer as primeiras vendas, investimento menor e menor compromisso. Inclui encontro semanal em grupo para análise e otimização da loja.

TRIMESTRAL CREATION + I.A. — 3x de R$ 347 ou R$ 970 à vista. Indicado para iniciante que quer uma operação estruturada e dedicação por três meses. Inclui encontro semanal em grupo. O objetivo comercial de buscar R$ 20 mil de faturamento não é promessa nem garantia.

MENTORIA TRIMESTRAL INDIVIDUAL 3 CLIQUES — 3x de R$ 1.070 ou R$ 2.997 à vista. Indicada para quem já vende, tem loja ou faturamento e deseja estratégia personalizada para crescer. Diferencial: encontro individual semanal. O objetivo de buscar R$ 50 mil de faturamento não é promessa nem garantia.

Pagamento por Pix ou cartão; trimestrais podem ser parcelados em até 3x no cartão. Links de checkout: Mensal SABR https://pay.kiwify.com.br/legaimc ; Trimestral Creation + I.A. https://pay.kiwify.com.br/an8fKSB ; Mentoria Individual https://pay.kiwify.com.br/xaqKLLl . Página de vendas: https://3cliques.net/seu-armazem-drop-organico/`,
  },
  {
    titulo: "VIGENTE — Seu Armazém Drop: qualificação e recomendação de plano",
    categoria: "Processos",
    tags: ["sabr", "seu armazém drop", "vendas", "qualificação", "vigente"],
    conteudo: `Antes de sugerir uma oferta, descubra: 1) a pessoa já vende online ou começa do zero; 2) se tem loja em Shopee ou outro marketplace; 3) faturamento mensal aproximado, se já vende; 4) objetivo; 5) preferência entre acompanhamento em grupo ou individual; 6) orçamento inicial; 7) tempo disponível para a operação. Não listar todos os planos de primeira nem jogar preço sem contexto.

REGRAS: quem está começando e quer investir menos: Mensal SABR. Quem começa e quer uma estrutura de três meses: Trimestral Creation + I.A. Quem já vende e quer acompanhamento personalizado para crescer: Mentoria Trimestral Individual. Se o orçamento não comportar o recomendado, apresente opção compatível sem pressão. Se houver dúvida entre dois planos, compare tipo de acompanhamento e compromisso financeiro.

RESPOSTA PARA QUEM COMEÇA: “Como você está começando, temos duas opções principais. O Mensal SABR custa R$ 197 por mês, pode ser cancelado quando quiser e é indicado para conhecer a operação com menor compromisso. O Trimestral Creation + I.A. custa 3x de R$ 347 ou R$ 970 à vista e é para quem quer uma estrutura de três meses. Quanto você pretende investir inicialmente e quanto tempo poderá dedicar à sua loja?”

RESPOSTA PARA QUEM JÁ VENDE: “Como você já possui uma operação ativa, qual é aproximadamente seu faturamento mensal e qual resultado pretende alcançar? Para quem já vende e procura acompanhamento personalizado, a Mentoria Trimestral Individual costuma ser a opção mais adequada, pois tem encontro individual semanal para analisar e desenvolver a operação.”`,
  },
  {
    titulo: "VIGENTE — Seu Armazém Drop: regras comerciais e resposta sobre diferenças",
    categoria: "Objeções",
    tags: ["sabr", "seu armazém drop", "regras", "objeções", "vigente"],
    conteudo: `RESPOSTA PARA “qual a diferença entre os planos?”: “Todos os planos oferecem catálogo com mais de 1.000 produtos, fornecedor exclusivo, sistemas de pedidos e etiquetas, treinamentos, ferramentas de IA, publicação de 50 anúncios na Shopee e suporte especializado. A diferença principal é o acompanhamento e o momento da operação: Mensal SABR, R$ 197 por mês e cancelável a qualquer momento, é a porta de entrada com menor compromisso; Creation + I.A., 3x de R$ 347 ou R$ 970 à vista, estrutura a operação por três meses; Mentoria Individual, 3x de R$ 1.070 ou R$ 2.997 à vista, é para quem já vende e quer encontro individual semanal. Você já vende ou começará do zero?”

O agente deve consultar a base antes de informar preços ou benefícios, explicar por que o plano combina com o perfil, usar preços atuais, esclarecer que resultados dependem da execução e encaminhar a consultor em caso de informação ausente. Pode apresentar garantia de sete dias conforme condições vigentes.

O agente não deve garantir vendas, lucro ou faturamento; prometer R$ 20 mil ou R$ 50 mil; inventar benefícios, descontos, urgência, prazo ou condição especial; mencionar campanhas, bônus ou eventos encerrados; usar preço de conversas antigas; pressionar pelo plano mais caro; recomendar sem entender o momento do cliente. Não mencionar evento ou ingresso de campanha encerrada.

OBJEÇÕES: se disser “está caro”, comparar com a estrutura reunida — fornecedor, catálogo, pedidos, etiquetas, logística, treinamento, IA, SEO e suporte — sem prometer retorno. Se disser “vou pensar”, perguntar o que ainda precisa avaliar. Se tiver medo de não vender, reconhecer que nenhuma plataforma séria garante resultado. Se não tiver tempo, explicar que a estrutura reduz estoque e envio, mas ainda exige dedicação para publicar, precificar, acompanhar anúncios e atender clientes. Se pedir humano ou trouxer caso técnico específico, transferir para atendimento.`,
  },
];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { tenant_id?: string };
  const tenantId = body.tenant_id?.trim();
  if (!tenantId) return NextResponse.json({ error: "tenant_id obrigatorio" }, { status: 400 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;

  try {
    const { data: removed, error: removeError } = await auth.admin.from("knowledge_base")
      .delete()
      .eq("tenant_id", tenantId)
      .or("titulo.ilike.%dropsummit%,conteudo.ilike.%dropsummit%,titulo.ilike.%VIGENTE — Seu Armazém Drop%")
      .select("id");
    if (removeError) throw removeError;

    // O workflow n8n "BASE RAG — Backfill de embeddings" coleta artigos sem
    // embedding e grava vetores OpenAI no mesmo espaco vetorial ja usado pela
    // busca semantica. Nao gerar Vertex aqui: misturar modelos corrompe o RAG.
    const { error: insertError } = await auth.admin.from("knowledge_base").insert(articles.map((article) => ({
      tenant_id: tenantId,
      titulo: article.titulo,
      conteudo: article.conteudo,
      categoria: article.categoria,
      tags: article.tags,
      publicado: true,
    })));
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, removidos: removed?.length ?? 0, criados: articles.length });
  } catch (error) {
    console.error("knowledge refresh sabr failed", error);
    return NextResponse.json({ error: "Nao foi possivel atualizar a base de conhecimento" }, { status: 500 });
  }
}
