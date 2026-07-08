"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, GitBranch, Zap, Edit2, Trash2, ToggleLeft, ToggleRight, Crown, LayoutTemplate, X } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const DEPT_COLOR: Record<string, string> = { vendas: "#10B981", suporte: "#60a5fa", todos: "#a78bfa" };

export default function FlowsPage() {
  const { tenantId } = useTenant();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  const FLOW_TEMPLATES = [
    {
      id: "boas-vindas",
      nome: "Boas-vindas + Qualificação",
      desc: "Recepciona o lead, coleta nome e interesse, qualifica e transfere para vendas",
      keywords: ["oi", "olá", "bom dia", "boa tarde", "boa noite", "hello"],
      departamento: "todos",
      cor: "#10B981",
      flow_definition: {
        nodes: [
          { id: "start", type: "start", position: { x: 50, y: 200 }, data: { label: "Início" } },
          { id: "msg1", type: "message", position: { x: 250, y: 200 }, data: { text: "Olá! 😊 Seja bem-vindo! Sou a assistente virtual. Como posso te ajudar hoje?" } },
          { id: "ask1", type: "ask", position: { x: 450, y: 200 }, data: { question: "Qual é o seu nome?", save_as: "nome_lead" } },
          { id: "ask2", type: "ask", position: { x: 650, y: 200 }, data: { question: "Qual serviço você tem interesse?", save_as: "interesse" } },
          { id: "ai1", type: "ai_response", position: { x: 850, y: 200 }, data: { context_prompt: "Qualifique o lead com base no interesse informado. Seja breve e entusiasta.", max_tentativas: 1, usar_kb: true } },
          { id: "transfer1", type: "transfer", position: { x: 1050, y: 200 }, data: { departamento: "vendas" } },
        ],
        edges: [
          { id: "e1", source: "start", target: "msg1" },
          { id: "e2", source: "msg1", target: "ask1" },
          { id: "e3", source: "ask1", target: "ask2" },
          { id: "e4", source: "ask2", target: "ai1" },
          { id: "e5", source: "ai1", sourceHandle: "default", target: "transfer1" },
        ],
      },
    },
    {
      id: "vendas",
      nome: "Vendas de Produto",
      desc: "Responde dúvidas sobre preços e produtos usando KB, depois qualifica para compra",
      keywords: ["preço", "valor", "quanto", "comprar", "plano", "contratar", "quero"],
      departamento: "vendas",
      cor: "#facc15",
      flow_definition: {
        nodes: [
          { id: "start", type: "start", position: { x: 50, y: 200 }, data: { label: "Início" } },
          { id: "ai1", type: "ai_response", position: { x: 250, y: 200 }, data: { context_prompt: "Responda sobre preços e produtos. Use a base de conhecimento. Seja persuasivo mas honesto.", max_tentativas: 2, usar_kb: true } },
          { id: "ask1", type: "ask_options", position: { x: 500, y: 200 }, data: { question: "Tem interesse em prosseguir?", options: [{ label: "Sim, quero!" }, { label: "Preciso pensar" }, { label: "Não, obrigado" }] } },
          { id: "transfer1", type: "transfer", position: { x: 750, y: 100 }, data: { departamento: "vendas" } },
          { id: "msg1", type: "message", position: { x: 750, y: 250 }, data: { text: "Sem problema! Quando quiser, é só chamar. 😊" } },
          { id: "end1", type: "end", position: { x: 750, y: 380 }, data: { message: "Obrigado pelo contato!" } },
        ],
        edges: [
          { id: "e1", source: "start", target: "ai1" },
          { id: "e2", source: "ai1", sourceHandle: "default", target: "ask1" },
          { id: "e3", source: "ask1", sourceHandle: "option_0", target: "transfer1" },
          { id: "e4", source: "ask1", sourceHandle: "option_1", target: "msg1" },
          { id: "e5", source: "ask1", sourceHandle: "option_2", target: "end1" },
        ],
      },
    },
    {
      id: "suporte",
      nome: "Suporte Técnico",
      desc: "IA tenta resolver o problema 2x antes de transferir para o suporte humano",
      keywords: ["problema", "erro", "não funciona", "ajuda", "suporte", "quebrou"],
      departamento: "suporte",
      cor: "#60a5fa",
      flow_definition: {
        nodes: [
          { id: "start", type: "start", position: { x: 50, y: 200 }, data: { label: "Início" } },
          { id: "msg1", type: "message", position: { x: 250, y: 200 }, data: { text: "Entendido! Vou verificar isso para você agora. 🔍" } },
          { id: "ai1", type: "ai_response", position: { x: 450, y: 200 }, data: { context_prompt: "Tente resolver o problema do cliente. Use a base de conhecimento.", max_tentativas: 2, usar_kb: true } },
          { id: "transfer1", type: "transfer", position: { x: 700, y: 200 }, data: { departamento: "suporte" } },
        ],
        edges: [
          { id: "e1", source: "start", target: "msg1" },
          { id: "e2", source: "msg1", target: "ai1" },
          { id: "e3", source: "ai1", sourceHandle: "nao_sei", target: "transfer1" },
          { id: "e4", source: "ai1", sourceHandle: "humano", target: "transfer1" },
          { id: "e5", source: "ai1", sourceHandle: "default", target: "transfer1" },
        ],
      },
    },
    {
      id: "captacao",
      nome: "Captação de Lead",
      desc: "Coleta nome, WhatsApp e email do lead e avisa que a equipe entrará em contato",
      keywords: ["quero", "interesse", "informação", "cadastro", "saber mais"],
      departamento: "todos",
      cor: "#a78bfa",
      flow_definition: {
        nodes: [
          { id: "start", type: "start", position: { x: 50, y: 200 }, data: { label: "Início" } },
          { id: "msg1", type: "message", position: { x: 250, y: 200 }, data: { text: "Ótimo! Para entrarmos em contato, preciso de algumas informações rápidas." } },
          { id: "ask1", type: "ask", position: { x: 450, y: 200 }, data: { question: "Qual é o seu nome completo?", save_as: "nome_completo" } },
          { id: "ask2", type: "ask", position: { x: 650, y: 200 }, data: { question: "Qual é o seu email?", save_as: "email" } },
          { id: "end1", type: "end", position: { x: 850, y: 200 }, data: { message: "Perfeito! Nossa equipe entrará em contato em breve. Obrigado! 🎉" } },
        ],
        edges: [
          { id: "e1", source: "start", target: "msg1" },
          { id: "e2", source: "msg1", target: "ask1" },
          { id: "e3", source: "ask1", target: "ask2" },
          { id: "e4", source: "ask2", target: "end1" },
        ],
      },
    },
    {
      id: "faq",
      nome: "FAQ Automático",
      desc: "Responde dúvidas frequentes usando a base de conhecimento, transfere se não souber",
      keywords: ["como funciona", "o que é", "dúvida", "pergunta", "explicar", "entender"],
      departamento: "todos",
      cor: "#f97316",
      flow_definition: {
        nodes: [
          { id: "start", type: "start", position: { x: 50, y: 200 }, data: { label: "Início" } },
          { id: "ai1", type: "ai_response", position: { x: 250, y: 200 }, data: { context_prompt: "Responda a dúvida usando a base de conhecimento. Se não souber, diga que vai transferir.", max_tentativas: 1, usar_kb: true } },
          { id: "transfer1", type: "transfer", position: { x: 500, y: 320 }, data: { departamento: "suporte" } },
          { id: "end1", type: "end", position: { x: 500, y: 100 }, data: { message: "Espero ter ajudado! Qualquer dúvida, é só chamar. 😊" } },
        ],
        edges: [
          { id: "e1", source: "start", target: "ai1" },
          { id: "e2", source: "ai1", sourceHandle: "resolvido", target: "end1" },
          { id: "e3", source: "ai1", sourceHandle: "nao_sei", target: "transfer1" },
          { id: "e4", source: "ai1", sourceHandle: "default", target: "end1" },
        ],
      },
    },
  ];

  async function createFromTemplate(template: typeof FLOW_TEMPLATES[0]) {
    if (!tenantId) return;
    setCreatingTemplate(template.id);
    await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        nome: template.nome,
        descricao: template.desc,
        trigger_keywords: template.keywords,
        departamento: template.departamento,
        flow_definition: template.flow_definition,
        ativo: true,
      }),
    });
    await fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => setFlows(d.flows ?? []));
    setCreatingTemplate(null);
    setShowTemplates(false);
  }

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => { setFlows(d.flows ?? []); setLoading(false); });
  }, [tenantId]);

  async function toggleAtivo(flow: any) {
    await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: flow.id, ativo: !flow.ativo }) });
    setFlows(f => f.map(x => x.id === flow.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function deleteFlow(id: string) {
    if (!confirm("Excluir este fluxo?")) return;
    await fetch("/api/flows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: id }) });
    setFlows(f => f.filter(x => x.id !== id));
  }

  async function toggleMaster(flow: any) {
    // Desativar master atual (se houver) e ativar o novo
    const newIsMaster = !flow.is_master;
    if (newIsMaster) {
      // Remove master dos outros
      for (const f of flows) {
        if (f.is_master && f.id !== flow.id) {
          await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: f.id, is_master: false }) });
        }
      }
      setFlows(f => f.map(x => ({ ...x, is_master: x.id === flow.id })));
    } else {
      setFlows(f => f.map(x => x.id === flow.id ? { ...x, is_master: false } : x));
    }
    await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: flow.id, is_master: newIsMaster }) });
  }

  async function createDefault() {
    if (!tenantId) return;
    const defaults = [
      { nome: "Boas-vindas", descricao: "Recebe o lead e oferece opções", trigger_keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite"], departamento: "todos" },
      { nome: "Suporte Técnico", descricao: "IA tenta resolver antes de transferir", trigger_keywords: ["problema", "erro", "nao funciona", "ajuda", "suporte"], departamento: "suporte" },
      { nome: "Vendas e Preços", descricao: "Qualifica leads comerciais", trigger_keywords: ["preco", "valor", "quanto custa", "plano", "contratar"], departamento: "vendas" },
    ];
    for (const d of defaults) {
      await fetch("/api/flows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, tenant_id: tenantId }) });
    }
    fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => setFlows(d.flows ?? []));
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-[-0.03em]">Chat Flows</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Defina como a IA se comporta — ela tenta resolver antes de transferir
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={showTemplates ? { background: "rgba(16,185,129,0.15)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>
            <LayoutTemplate className="w-4 h-4" /> Templates
          </button>
          <Link href="/ia/flows/new" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#10B981", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Novo fluxo
          </Link>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-bold text-white">Templates prontos</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Fluxos de vendas e suporte — ative com 1 clique</p>
            </div>
            <button onClick={() => setShowTemplates(false)}><X className="w-4 h-4" style={{ color: "var(--text-secondary)" }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {FLOW_TEMPLATES.map(t => (
              <div key={t.id} className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white">{t.nome}</p>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t.desc}</p>
                  </div>
                  <span className="shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: t.cor }} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.keywords.slice(0, 4).map(k => (
                    <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>"{k}"</span>
                  ))}
                </div>
                <button onClick={() => createFromTemplate(t)} disabled={creatingTemplate === t.id}
                  className="w-full h-7 rounded-lg text-xs font-bold transition-all"
                  style={{ background: `${t.cor}18`, color: t.cor, border: `1px solid ${t.cor}30`, opacity: creatingTemplate === t.id ? 0.6 : 1 }}>
                  {creatingTemplate === t.id ? "Criando..." : "+ Usar template"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicação */}
      <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Quando um lead manda uma mensagem, o sistema verifica se alguma keyword ativa um fluxo.
          Dentro do fluxo, a IA tenta resolver o problema — só transfere para humano quando o fluxo mandar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : flows.length === 0 ? (
        <div className="py-20 text-center rounded-xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
          <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum fluxo ainda</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Crie fluxos para controlar como a IA responde</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(flow => {
            const deptColor = DEPT_COLOR[flow.departamento] ?? "#939da4";
            return (
              <div key={flow.id} className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${deptColor}15` }}>
                      <GitBranch className="w-5 h-5" style={{ color: deptColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-white">{flow.nome}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                          style={{ color: deptColor, background: `${deptColor}15` }}>{flow.departamento}</span>
                        {flow.is_master && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(250,204,21,0.15)", color: "#facc15" }}>
                            <Crown className="w-2.5 h-2.5" /> Master
                          </span>
                        )}
                        {!flow.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>Inativo</span>}
                      </div>
                      {flow.descricao && <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{flow.descricao}</p>}
                      {(flow.trigger_keywords ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <Zap className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
                          {(flow.trigger_keywords ?? []).slice(0, 5).map((kw: string) => (
                            <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                              style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}>"{kw}"</span>
                          ))}
                          {(flow.trigger_keywords ?? []).length > 5 && (
                            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>+{flow.trigger_keywords.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button onClick={() => toggleMaster(flow)} title={flow.is_master ? "Remover como Master" : "Definir como Master Flow"}>
                      <Crown className="w-4 h-4" style={{ color: flow.is_master ? "#facc15" : "rgba(147,157,164,0.3)" }} />
                    </button>
                    <button onClick={() => toggleAtivo(flow)}>
                      {flow.ativo
                        ? <ToggleRight className="w-5 h-5" style={{ color: "var(--status-ganho)" }} />
                        : <ToggleLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />}
                    </button>
                    <Link href={`/ia/flows/${flow.id}/edit`}><Edit2 className="w-4 h-4" style={{ color: "var(--text-secondary)" }} /></Link>
                    <button onClick={() => deleteFlow(flow.id)}><Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
