"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const TEMPLATES = [
  {
    id: "boas_vindas",
    nome: "Boas-vindas",
    desc: "Recebe o lead, oferece opções e qualifica o interesse",
    keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "hello"],
    departamento: "todos",
    cor: "#9aea62",
  },
  {
    id: "suporte",
    nome: "Suporte Técnico",
    desc: "IA tenta resolver o problema. Só transfere após esgotar as tentativas",
    keywords: ["problema", "erro", "nao funciona", "ajuda", "bug", "suporte"],
    departamento: "suporte",
    cor: "#60a5fa",
  },
  {
    id: "vendas",
    nome: "Vendas e Preços",
    desc: "Qualifica leads comerciais e agenda proposta com o time de vendas",
    keywords: ["preco", "valor", "quanto custa", "plano", "contratar", "comprar"],
    departamento: "vendas",
    cor: "#fb923c",
  },
  {
    id: "vazio",
    nome: "Fluxo em branco",
    desc: "Comece do zero com um canvas vazio",
    keywords: [],
    departamento: "todos",
    cor: "#939da4",
  },
];

export default function NewFlowPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  async function create() {
    if (!tenantId || !selected) return;
    setCreating(true);
    const tpl = TEMPLATES.find(t => t.id === selected)!;
    const r = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        nome: tpl.nome,
        descricao: tpl.desc,
        trigger_keywords: tpl.keywords,
        departamento: tpl.departamento,
      }),
    });
    const { flow } = await r.json();
    setCreating(false);
    if (flow?.id) router.push(`/ia/flows/${flow.id}/edit`);
  }

  return (
    <div className="p-8 max-w-2xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <Link href="/ia/flows" className="flex items-center gap-1.5 text-xs" style={{ color: "#939da4" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Novo fluxo</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Escolha um template para começar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map(tpl => (
          <button key={tpl.id} onClick={() => setSelected(tpl.id)}
            className="p-5 rounded-2xl text-left transition-all"
            style={selected === tpl.id
              ? { background: `${tpl.cor}08`, border: `2px solid ${tpl.cor}40` }
              : cardStyle}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${tpl.cor}15` }}>
                <GitBranch className="w-5 h-5" style={{ color: tpl.cor }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{tpl.nome}</p>
                <span className="text-[10px] font-bold capitalize px-1.5 py-0.5 rounded-full"
                  style={{ color: tpl.cor, background: `${tpl.cor}15` }}>{tpl.departamento}</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#939da4" }}>{tpl.desc}</p>
            {tpl.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tpl.keywords.slice(0, 4).map(k => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>"{k}"</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <button onClick={create} disabled={!selected || creating}
        className="w-full h-11 rounded-xl text-sm font-bold transition-all"
        style={{ background: selected ? "#9aea62" : "rgba(255,255,255,0.06)", color: selected ? "#0a0a0a" : "#939da4", opacity: creating ? 0.6 : 1 }}>
        {creating ? "Criando..." : selected ? `Criar fluxo "${TEMPLATES.find(t => t.id === selected)?.nome}"` : "Selecione um template"}
      </button>
    </div>
  );
}
