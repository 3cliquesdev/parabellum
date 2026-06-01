import Link from "next/link";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import {
  CheckCircle, ArrowRight, Zap, Users, MessageSquare, Bot,
  BarChart2, Megaphone, Globe, TrendingUp, Layers, DollarSign,
  ShieldCheck, Code2, Workflow
} from "lucide-react";

const CHECKS = [
  "CRM completo com IA",
  "WhatsApp integrado",
  "White-label real",
  "Domínio próprio",
  "Receita recorrente mensal",
  "Sem precisar programar nada",
];

const FEATURES = [
  { icon: Bot, title: "IA contextual com memória", desc: "A IA entende produtos, preços, objeções e contexto real da conversa." },
  { icon: Layers, title: "RAG com documentos", desc: "Treine a IA com PDFs, sites e materiais da empresa." },
  { icon: Workflow, title: "Fluxos visuais", desc: "Automatize atendimento sem depender de técnico." },
  { icon: MessageSquare, title: "WhatsApp com IA", desc: "Atendimento automático 24h." },
  { icon: ShieldCheck, title: "White-label real", desc: "Seu cliente nunca vê Liberty CRM." },
  { icon: DollarSign, title: "Split automático", desc: "Comissões distribuídas automaticamente." },
];

const HOW = [
  { n: "01", title: "Crie sua marca", desc: "Personalize logo, domínio, cores e identidade visual." },
  { n: "02", title: "Crie workspaces", desc: "Cada cliente recebe seu próprio CRM separado." },
  { n: "03", title: "Defina seu preço", desc: "Você escolhe quanto cobrar." },
  { n: "04", title: "Gere recorrência", desc: "Receba mensalmente pelos clientes ativos." },
];

const TARGETS = [
  "Agências de marketing", "Gestores de tráfego", "Consultores",
  "Especialistas em automação", "Social medias", "Freelancers",
  "Empreendedores digitais", "Agências de IA", "Agências de WhatsApp Marketing",
];

const OBJECTIONS = [
  { q: "Preciso saber programar?", a: "Não. A estrutura já vem pronta." },
  { q: "Preciso montar servidores?", a: "Não. Tudo hospedado e gerenciado." },
  { q: "Posso usar minha marca?", a: "Sim. White-label completo." },
  { q: "Meu cliente vê Liberty CRM?", a: "Não. A experiência é totalmente sua." },
];

const FAQ = [
  { q: "O que é um CRM white-label?", a: "É um CRM que funciona com sua marca, domínio e identidade visual." },
  { q: "Posso cobrar meus próprios clientes?", a: "Sim. Você define os valores." },
  { q: "Liberty CRM aparece para o cliente?", a: "Não. O ambiente é totalmente personalizado." },
  { q: "Preciso saber programar?", a: "Não." },
  { q: "A IA responde WhatsApp automaticamente?", a: "Sim." },
  { q: "Posso treinar a IA com PDFs?", a: "Sim." },
  { q: "Existe recorrência mensal?", a: "Sim. O modelo foi criado para gerar receita recorrente." },
];

const CALC = [
  { clientes: 10, mrr: "R$4.970" },
  { clientes: 30, mrr: "R$14.910" },
  { clientes: 50, mrr: "R$24.850" },
];

export default function ParceirosPage() {
  return (
    <main className="min-h-screen" style={{ background: "#000", fontFamily: "var(--font-sans)" }}>
      <NavBar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(154,234,98,0.07) 0%, transparent 70%)",
        }} />
        <div className="relative max-w-[860px] mx-auto">
          <p className="section-label mb-5">Liberty CRM Parceiro</p>
          <h1 className="text-[44px] md:text-[64px] font-extrabold text-white leading-[1.05] tracking-[-0.04em] mb-6">
            Tenha Seu Próprio CRM com<br className="hidden md:block" />
            Sua Marca e Gere{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Recorrência</span>
            {" "}Todos os Meses
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-[620px] mx-auto leading-relaxed" style={{ color: "#939da4" }}>
            Transforme sua agência em uma máquina de receita recorrente com um CRM white-label completo, IA integrada e estrutura pronta para escalar clientes sem precisar desenvolver tecnologia.
          </p>
          <Link href="/signup" className="btn-lime inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold">
            QUERO MINHA MARCA NO CRM <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── PROVA RÁPIDA ── */}
      <section className="py-8 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[1000px] mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {CHECKS.map(c => (
            <div key={c} className="flex items-center gap-2.5">
              <CheckCircle size={15} className="shrink-0" style={{ color: "#9aea62" }} />
              <span className="text-sm font-medium" style={{ color: "#f9f6ec" }}>{c}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── O PROBLEMA ── */}
      <section className="py-28 px-6">
        <div className="max-w-[800px] mx-auto">
          <p className="section-label mb-5">O Problema</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-10">
            Sua agência vende serviços.<br />
            Mas ainda depende de clientes<br className="hidden md:block" />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}> entrando todo mês.</span>
          </h2>
          <div className="space-y-4 mb-10">
            {["fechamento constante,", "troca de horas por dinheiro,", "clientes entrando e saindo,", "operação pesada,", "pouca previsibilidade."].map(p => (
              <p key={p} className="text-lg" style={{ color: "#939da4" }}>— {p}</p>
            ))}
          </div>
          <p className="text-lg leading-relaxed" style={{ color: "#939da4" }}>
            Enquanto isso, empresas SaaS crescem com receita recorrente todos os meses.
            <br /><br />
            Agora imagine transformar sua agência em uma empresa de tecnologia sem precisar desenvolver uma linha de código.
          </p>
        </div>
      </section>

      {/* ── A OPORTUNIDADE ── */}
      <section className="py-28 px-6" style={{ background: "rgba(154,234,98,0.02)", borderTop: "1px solid rgba(154,234,98,0.08)", borderBottom: "1px solid rgba(154,234,98,0.08)" }}>
        <div className="max-w-[1000px] mx-auto">
          <p className="section-label mb-5 text-center">A Oportunidade</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white text-center leading-[1.1] tracking-[-0.03em] mb-14">
            Venda seu próprio CRM<br className="hidden md:block" />{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>como serviço</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
            {["Painel white-label", "CRM com sua marca", "Domínio próprio", "WhatsApp integrado", "IA treinável", "Automações", "Pipeline", "Inbox", "Relatórios", "Multiusuários", "Onboarding simplificado"].map(f => (
              <div key={f} className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <CheckCircle size={14} style={{ color: "#9aea62" }} className="shrink-0" />
                <span className="text-sm font-medium text-white">{f}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-lg" style={{ color: "#939da4" }}>
            Você cuida do relacionamento.<br />
            <strong className="text-white">A Liberty cuida da tecnologia.</strong>
          </p>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <p className="section-label mb-5 text-center">Como Funciona</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white text-center leading-[1.1] tracking-[-0.03em] mb-14">
            Você vende. Seu cliente usa.{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Você recebe todos os meses.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW.map(({ n, title, desc }) => (
              <div key={n} className="card-dark rounded-[20px] p-7">
                <p className="text-[42px] font-extrabold mb-4 leading-none tracking-tighter" style={{ color: "rgba(154,234,98,0.25)" }}>{n}</p>
                <p className="text-base font-bold text-white mb-2">{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#939da4" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAL ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <p className="section-label mb-5 text-center">Diferencial</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white text-center leading-[1.1] tracking-[-0.03em] mb-14">
            Muito além de um{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>CRM comum</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-dark rounded-[20px] p-7">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(154,234,98,0.1)" }}>
                  <Icon size={18} style={{ color: "#9aea62" }} />
                </div>
                <p className="text-base font-bold text-white mb-2">{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#939da4" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODELO DE NEGÓCIO ── */}
      <section className="py-28 px-6" style={{ background: "rgba(154,234,98,0.02)", borderTop: "1px solid rgba(154,234,98,0.08)", borderBottom: "1px solid rgba(154,234,98,0.08)" }}>
        <div className="max-w-[800px] mx-auto text-center">
          <p className="section-label mb-5">Modelo de Negócio</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-8">
            Construa uma{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>receita previsível</span>
          </h2>
          <p className="text-lg mb-14" style={{ color: "#939da4" }}>
            Enquanto agências tradicionais vivem de projetos pontuais…<br />
            Você pode construir uma base recorrente de clientes pagando todos os meses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {CALC.map(({ clientes, mrr }) => (
              <div key={clientes} className="card-dark rounded-[20px] p-8 text-center">
                <p className="text-sm font-bold mb-3" style={{ color: "#939da4" }}>{clientes} clientes × R$497/mês</p>
                <p className="text-[40px] font-extrabold tracking-tight leading-none" style={{ color: "#9aea62" }}>{mrr}</p>
                <p className="text-xs mt-2 font-medium" style={{ color: "rgba(147,157,164,0.5)" }}>por mês recorrentes</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm" style={{ color: "#939da4" }}>
            <p>Sem precisar criar software.</p>
            <p>Sem equipe de desenvolvimento.</p>
            <p>Sem anos de construção.</p>
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="section-label mb-5">Para Quem É</p>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-14">Perfeito para:</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {TARGETS.map(t => (
              <span key={t} className="px-5 py-2.5 rounded-full text-sm font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f9f6ec" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── OBJEÇÕES ── */}
      <section className="py-28 px-6">
        <div className="max-w-[700px] mx-auto">
          <p className="section-label mb-5 text-center">Dúvidas Comuns</p>
          <div className="space-y-3">
            {OBJECTIONS.map(({ q, a }) => (
              <div key={q} className="card-dark rounded-[16px] p-6">
                <p className="text-base font-bold text-white mb-2">"{q}"</p>
                <p className="text-sm" style={{ color: "#9aea62" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{ background: "linear-gradient(135deg, rgba(154,234,98,0.08) 0%, rgba(0,0,0,0) 100%)", border: "1px solid rgba(154,234,98,0.15)" }}>
            <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-6">
              Comece a construir sua<br />
              <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>recorrência hoje</span>
            </h2>
            <p className="text-lg mb-10" style={{ color: "#939da4" }}>
              Tenha seu próprio CRM com IA, WhatsApp e automações rodando com sua marca em poucos dias.
              Transforme sua agência em uma empresa SaaS.
            </p>
            <Link href="/signup" className="btn-lime inline-flex items-center gap-2.5 px-10 py-4 text-base font-bold">
              QUERO VIRAR PARCEIRO <ArrowRight size={18} />
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8">
              {["Trial gratuito", "Sem cartão", "Suporte incluso"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={13} style={{ color: "#9aea62" }} />
                  <span className="text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SEO ── */}
      <section className="py-20 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-2xl font-extrabold text-white tracking-[-0.02em] mb-8">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
                <p className="text-sm font-bold text-white mb-1.5">{q}</p>
                <p className="text-sm" style={{ color: "#939da4" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
