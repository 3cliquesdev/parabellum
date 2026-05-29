"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, BookOpen, Zap, MessageSquare, FlaskConical, ThumbsUp, ArrowRight, Sparkles } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  agents: number;
  articles: number;
  training: number;
  responses: number;
  feedback_pos: number;
  feedback_neg: number;
}

const TOOLS = [
  {
    href: "/ia/agents",
    icon: Bot,
    label: "Agentes",
    desc: "Crie agentes especializados com personalidades e funções diferentes",
    color: "#9aea62",
    statKey: "agents",
    statLabel: "agente(s) ativo(s)",
  },
  {
    href: "/ia/knowledge",
    icon: BookOpen,
    label: "Base de Conhecimento",
    desc: "Artigos que a IA usa para responder leads com precisão",
    color: "#60a5fa",
    statKey: "articles",
    statLabel: "artigo(s)",
  },
  {
    href: "/ia/training",
    icon: Zap,
    label: "Treinamento",
    desc: "Exemplos de respostas ideais por cenário para refinar a IA",
    color: "#facc15",
    statKey: "training",
    statLabel: "exemplo(s)",
  },
  {
    href: "/ia/responses",
    icon: MessageSquare,
    label: "Respostas Rápidas",
    desc: "Templates com atalhos para agilizar o atendimento humano",
    color: "#a78bfa",
    statKey: "responses",
    statLabel: "template(s)",
  },
  {
    href: "/ia/sandbox",
    icon: FlaskConical,
    label: "Sandbox",
    desc: "Teste a IA com KB e treinamento antes de ativar para clientes",
    color: "#fb923c",
    statKey: null,
    statLabel: "Testar agora",
  },
  {
    href: "/ia/feedback",
    icon: ThumbsUp,
    label: "Feedback",
    desc: "Avaliações das respostas da IA para melhoria contínua",
    color: "#f87171",
    statKey: "feedback_pos",
    statLabel: "avaliação(ões) positiva(s)",
  },
];

export default function StudioIAPage() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<Stats>({ agents: 0, articles: 0, training: 0, responses: 0, feedback_pos: 0, feedback_neg: 0 });

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      const supabase = createClient();
      const [ag, kb, tr, rr, fb] = await Promise.all([
        supabase.from("personas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("ativo", true),
        supabase.from("knowledge_base").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("training_examples").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).eq("ativo", true),
        supabase.from("respostas_rapidas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("ai_feedback").select("tipo").eq("tenant_id", tenantId!),
      ]);
      const fbData = (fb.data ?? []) as { tipo: string }[];
      setStats({
        agents: ag.count ?? 0,
        articles: kb.count ?? 0,
        training: tr.count ?? 0,
        responses: rr.count ?? 0,
        feedback_pos: fbData.filter(f => f.tipo === "positivo").length,
        feedback_neg: fbData.filter(f => f.tipo === "negativo").length,
      });
    }
    load();
  }, [tenantId]);

  return (
    <div className="p-8 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(154,234,98,0.1)", border: "1px solid rgba(154,234,98,0.2)" }}>
          <Sparkles className="w-6 h-6" style={{ color: "#9aea62" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Studio IA</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            Configure, treine e gerencie toda a inteligência artificial do seu CRM
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TOOLS.map(({ href, icon: Icon, label, desc, color, statKey, statLabel }) => {
          const statValue = statKey ? (stats as any)[statKey] : null;
          return (
            <Link key={href} href={href}
              className="group rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200"
              style={{
                background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${color}25`;
                e.currentTarget.style.background = `linear-gradient(180deg, rgba(23,23,23,0.95) 0%, rgba(13,13,13,0.98) 100%)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
                e.currentTarget.style.background = "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)";
              }}>

              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#939da4" }} />
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">{label}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#939da4" }}>{desc}</p>
              </div>

              <div className="flex items-center justify-between">
                {statValue !== null ? (
                  <span className="text-xs font-bold" style={{ color }}>
                    {statValue} {statLabel}
                  </span>
                ) : (
                  <span className="text-xs font-medium" style={{ color: "#939da4" }}>{statLabel}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick status */}
      {(stats.agents === 0 || stats.articles === 0) && (
        <div className="rounded-2xl p-6" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.12)" }}>
          <h3 className="text-sm font-bold text-white mb-3">Comece por aqui</h3>
          <div className="space-y-2">
            {stats.agents === 0 && (
              <Link href="/ia/agents" className="flex items-center gap-2 text-xs" style={{ color: "#9aea62" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#9aea62" }} />
                Crie seu primeiro agente de IA
              </Link>
            )}
            {stats.articles === 0 && (
              <Link href="/ia/knowledge" className="flex items-center gap-2 text-xs" style={{ color: "#9aea62" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#9aea62" }} />
                Adicione artigos à base de conhecimento
              </Link>
            )}
            {stats.training === 0 && (
              <Link href="/ia/training" className="flex items-center gap-2 text-xs" style={{ color: "#9aea62" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#9aea62" }} />
                Adicione exemplos de treinamento
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
