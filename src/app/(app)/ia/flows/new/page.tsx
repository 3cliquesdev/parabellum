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
    desc: "Recebe o lead, oferece opcoes e qualifica o interesse",
    keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "hello"],
    departamento: "todos",
    cor: "#9aea62",
  },
  {
    id: "suporte",
    nome: "Suporte Tecnico",
    desc: "IA tenta resolver o problema. So transfere apos esgotar as tentativas",
    keywords: ["problema", "erro", "nao funciona", "ajuda", "bug", "suporte"],
    departamento: "suporte",
    cor: "#60a5fa",
  },
  {
    id: "vendas",
    nome: "Vendas e Precos",
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
] as const;

export default function NewFlowPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const cardStyle = {
    background: "var(--surface-gradient)",
    border: "1px solid var(--border-subtle)",
  };

  async function create() {
    if (!tenantId || !selected) return;
    setCreating(true);
    const tpl = TEMPLATES.find((template) => template.id === selected);
    if (!tpl) {
      setCreating(false);
      return;
    }

    const response = await fetch("/api/flows", {
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

    const { flow } = await response.json();
    setCreating(false);

    if (flow?.id) {
      router.push(`/ia/flows/${flow.id}/edit`);
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <Link href="/ia/flows" className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Novo fluxo</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Escolha um template para comecar
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelected(template.id)}
            className="p-5 rounded-2xl text-left transition-all"
            style={
              selected === template.id
                ? {
                    background: `${template.cor}08`,
                    border: `2px solid ${template.cor}40`,
                    boxShadow: `0 8px 20px ${template.cor}10`,
                  }
                : cardStyle
            }
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${template.cor}15` }}>
                <GitBranch className="w-5 h-5" style={{ color: template.cor }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{template.nome}</p>
                <span className="text-[10px] font-bold capitalize px-1.5 py-0.5 rounded-full" style={{ color: template.cor, background: `${template.cor}15` }}>
                  {template.departamento}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {template.desc}
            </p>

            {template.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {template.keywords.slice(0, 4).map((keyword) => (
                  <span
                    key={keyword}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
                  >
                    "{keyword}"
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={create}
        disabled={!selected || creating}
        className="w-full h-11 rounded-xl text-sm font-bold transition-all"
        style={{
          background: selected ? "#9aea62" : "var(--ghost-bg)",
          color: selected ? "#0a0a0a" : "var(--text-secondary)",
          border: selected ? "1px solid transparent" : "1px solid var(--chip-border)",
          opacity: creating ? 0.6 : 1,
        }}
      >
        {creating
          ? "Criando..."
          : selected
            ? `Criar fluxo "${TEMPLATES.find((template) => template.id === selected)?.nome}"`
            : "Selecione um template"}
      </button>
    </div>
  );
}
