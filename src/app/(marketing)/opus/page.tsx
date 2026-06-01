import Link from "next/link";
import { NavBar } from "@/components/marketing/NavBar";
import { Footer } from "@/components/marketing/Footer";
import {
  ArrowRight, CheckCircle, Bot, MessageSquare, BarChart2,
  Workflow, Layers, Users, Zap, Globe, ShieldCheck, Mic
} from "lucide-react";

const CARDS = [
  { icon: Globe, title: "CRM personalizado", desc: "Sua marca aplicada em toda a plataforma." },
  { icon: MessageSquare, title: "WhatsApp com IA", desc: "Atendimento inteligente 24h." },
  { icon: Bot, title: "IA treinada para seu negócio", desc: "Produtos, preços, objeções e processos." },
  { icon: BarChart2, title: "Pipeline comercial", desc: "Gestão visual de leads e negociações." },
  { icon: Workflow, title: "Automações inteligentes", desc: "Fluxos, follow-up e qualificação automática." },
  { icon: Users, title: "Dashboard executivo", desc: "Métricas e performance da equipe." },
];

const IA_ITEMS = [
  "entende contexto,",
  "possui memória,",
  "aprende com documentos,",
  "interpreta áudio,",
  "responde naturalmente,",
  "transfere para humanos quando necessário.",
];

const STEPS = [
  { n: "01", title: "Diagnóstico", desc: "Entendemos sua operação." },
  { n: "02", title: "Setup", desc: "Configuramos CRM, WhatsApp e IA." },
  { n: "03", title: "Personalização", desc: "Aplicamos sua identidade visual." },
  { n: "04", title: "Treinamento", desc: "Treinamos equipe e IA." },
  { n: "05", title: "Go Live", desc: "Sua operação entra no ar." },
];

const TARGETS = [
  "Clínicas", "Imobiliárias", "Agências", "Infoprodutores",
  "E-commerces", "Empresas locais", "Prestadores de serviço",
  "Times comerciais", "Operações com WhatsApp",
];

const DIFF_ITEMS = [
  "autoridade,", "percepção premium,", "organização,",
  "automação,", "escalabilidade,", "atendimento moderno,", "experiência profissional.",
];

const FAQ = [
  { q: "O CRM fica com minha marca?", a: "Sim. White-label completo." },
  { q: "A IA responde WhatsApp?", a: "Sim." },
  { q: "Posso usar meu domínio?", a: "Sim." },
  { q: "A Liberty aparece?", a: "Não." },
  { q: "A IA aprende com meus documentos?", a: "Sim." },
  { q: "Vocês fazem configuração?", a: "Sim. O setup é completo." },
  { q: "Existe treinamento?", a: "Sim." },
  { q: "Preciso de equipe técnica?", a: "Não." },
];

export default function OpusPage() {
  return (
    <main className="min-h-screen" style={{ background: "#000", fontFamily: "var(--font-sans)" }}>
      <NavBar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(154,234,98,0.05) 0%, transparent 70%)",
        }} />
        <div className="relative max-w-[780px] mx-auto">
          <p className="section-label mb-6">Liberty Opus</p>
          <h1 className="text-[44px] md:text-[62px] font-extrabold text-white leading-[1.05] tracking-[-0.04em] mb-6">
            Seu CRM. Sua Marca.<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Feito Exclusivamente</span>
            <br />Para o Seu Negócio.
          </h1>
          <p className="text-lg md:text-xl mb-12 max-w-[560px] mx-auto leading-relaxed" style={{ color: "#939da4" }}>
            Uma estrutura premium com IA, WhatsApp e automações personalizadas para sua empresa operar vendas e atendimento como uma grande operação tecnológica.
          </p>
          <Link href="#agendar" className="btn-lime inline-flex items-center gap-2.5 px-10 py-4 text-base font-bold">
            AGENDAR APRESENTAÇÃO <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── POSICIONAMENTO ── */}
      <section className="py-28 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[780px] mx-auto">
          <p className="section-label mb-5">Posicionamento</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-10">
            Você não precisa usar o<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>CRM de outra empresa.</span>
          </h2>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: "#939da4" }}>
            Com Liberty Opus, sua empresa recebe uma estrutura totalmente personalizada com:
          </p>
          <div className="space-y-3 mb-10">
            {["sua marca,", "seu domínio,", "sua identidade visual,", "seus fluxos,", "sua operação."].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#9aea62" }} />
                <p className="text-lg font-medium text-white">{i}</p>
              </div>
            ))}
          </div>
          <p className="text-lg" style={{ color: "#939da4" }}>
            Como se o sistema tivesse sido desenvolvido exclusivamente para você.<br />
            <strong className="text-white">Sem aparência genérica.</strong>{" "}
            <strong className="text-white">Sem limitações de plataformas comuns.</strong>
          </p>
        </div>
      </section>

      {/* ── EXPERIÊNCIA PREMIUM ── */}
      <section className="py-28 px-6" style={{ background: "rgba(154,234,98,0.02)", borderTop: "1px solid rgba(154,234,98,0.08)", borderBottom: "1px solid rgba(154,234,98,0.08)" }}>
        <div className="max-w-[780px] mx-auto">
          <p className="section-label mb-5">Por Que Agora</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-10">
            Uma operação moderna exige<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>mais que planilhas.</span>
          </h2>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: "#939da4" }}>
            Empresas que crescem precisam:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {["centralizar atendimento,", "automatizar vendas,", "responder rápido,", "acompanhar leads,", "integrar equipe,", "usar IA de verdade."].map(i => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <CheckCircle size={14} style={{ color: "#9aea62" }} className="shrink-0" />
                <span className="text-sm font-medium text-white">{i}</span>
              </div>
            ))}
          </div>
          <p className="text-lg mt-10 leading-relaxed" style={{ color: "#939da4" }}>
            O Liberty Opus transforma isso em uma operação{" "}
            <strong className="text-white">elegante, automatizada e escalável.</strong>
          </p>
        </div>
      </section>

      {/* ── O QUE VOCÊ RECEBE ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <p className="section-label mb-5 text-center">O Que Você Recebe</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white text-center leading-[1.1] tracking-[-0.03em] mb-14">
            Tudo que sua operação<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>precisa para crescer</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CARDS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-dark rounded-[20px] p-8">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(154,234,98,0.08)" }}>
                  <Icon size={18} style={{ color: "#9aea62" }} />
                </div>
                <p className="text-base font-bold text-white mb-2">{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#939da4" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA REAL ── */}
      <section className="py-28 px-6">
        <div className="max-w-[780px] mx-auto">
          <p className="section-label mb-5">Inteligência Artificial</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-6">
            Não é{" "}
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>chatbot simples</span>
          </h2>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: "#939da4" }}>A IA da Liberty Opus:</p>
          <div className="space-y-3 mb-10">
            {IA_ITEMS.map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#9aea62" }} />
                <p className="text-lg font-medium text-white">{i}</p>
              </div>
            ))}
          </div>
          <p className="text-lg" style={{ color: "#939da4" }}>Tudo integrado à operação da sua empresa.</p>
        </div>
      </section>

      {/* ── WHITE-LABEL ── */}
      <section className="py-28 px-6" style={{ background: "rgba(154,234,98,0.02)", borderTop: "1px solid rgba(154,234,98,0.08)", borderBottom: "1px solid rgba(154,234,98,0.08)" }}>
        <div className="max-w-[780px] mx-auto">
          <p className="section-label mb-5">White-Label Completo</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-10">
            A tecnologia desaparece.<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Sua marca aparece.</span>
          </h2>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: "#939da4" }}>Seu cliente verá:</p>
          <div className="grid grid-cols-2 gap-3 mb-10">
            {["seu domínio,", "sua identidade,", "sua comunicação,", "sua operação."].map(i => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <CheckCircle size={14} style={{ color: "#9aea62" }} className="shrink-0" />
                <span className="text-base font-medium text-white">{i}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 rounded-xl" style={{ background: "rgba(154,234,98,0.06)", border: "1px solid rgba(154,234,98,0.15)" }}>
            <p className="text-base font-bold" style={{ color: "#9aea62" }}>
              Sem qualquer menção à Liberty CRM. Uma experiência completamente exclusiva.
            </p>
          </div>
        </div>
      </section>

      {/* ── PROCESSO ── */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <p className="section-label mb-5 text-center">Implementação</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white text-center leading-[1.1] tracking-[-0.03em] mb-14">
            Implementação completa<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>feita com você</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                <div className="card-dark rounded-[20px] p-6 h-full">
                  <p className="text-[32px] font-extrabold mb-3 leading-none tracking-tighter" style={{ color: "rgba(154,234,98,0.2)" }}>{n}</p>
                  <p className="text-sm font-bold text-white mb-1.5">{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#939da4" }}>{desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 z-10 items-center justify-center">
                    <ArrowRight size={14} style={{ color: "rgba(154,234,98,0.3)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-28 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <p className="section-label mb-5">Ideal Para</p>
          <h2 className="text-[36px] md:text-[50px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-14">
            Empresas que querem profissionalizar<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>atendimento e vendas</span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {TARGETS.map(t => (
              <span key={t} className="px-5 py-2.5 rounded-full text-sm font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f9f6ec" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAL ── */}
      <section className="py-28 px-6" style={{ background: "rgba(154,234,98,0.02)", borderTop: "1px solid rgba(154,234,98,0.08)", borderBottom: "1px solid rgba(154,234,98,0.08)" }}>
        <div className="max-w-[780px] mx-auto">
          <p className="section-label mb-5">Vantagem Competitiva</p>
          <h2 className="text-[32px] md:text-[44px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-8">
            Enquanto outros usam plataformas…<br />
            <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Você opera com sua própria estrutura.</span>
          </h2>
          <p className="text-lg mb-8" style={{ color: "#939da4" }}>Seu negócio ganha:</p>
          <div className="grid grid-cols-2 gap-3">
            {DIFF_ITEMS.map(i => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle size={15} style={{ color: "#9aea62" }} className="shrink-0" />
                <span className="text-base font-medium text-white">{i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section id="agendar" className="py-28 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <div className="rounded-[28px] p-12 md:p-16" style={{ background: "linear-gradient(135deg, rgba(154,234,98,0.06) 0%, rgba(0,0,0,0) 100%)", border: "1px solid rgba(154,234,98,0.12)" }}>
            <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.1] tracking-[-0.03em] mb-6">
              Sua empresa merece uma<br />
              <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>estrutura feita para ela</span>
            </h2>
            <p className="text-lg mb-10" style={{ color: "#939da4" }}>
              Agende uma apresentação e descubra como ter um CRM com IA totalmente personalizado para sua operação.
            </p>
            <Link href="mailto:contato@libertycrm.com.br?subject=Liberty Opus - Agendamento" className="btn-lime inline-flex items-center gap-2.5 px-10 py-4 text-base font-bold">
              AGENDAR DEMONSTRAÇÃO <ArrowRight size={18} />
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8">
              {["White-label completo", "Setup incluso", "Sem código"].map(t => (
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
