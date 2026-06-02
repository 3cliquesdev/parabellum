"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, CheckCircle, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

const BG = "#050608";
const BG2 = "#0A0E15";
const CARD = "#0F1520";
const BORDER = "#1A2332";
const WHITE = "#F8FAFC";
const MUTED = "#64748B";
const LIGHT = "#94A3B8";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const GRAD = "linear-gradient(135deg, #22C55E, #16A34A)";

const premiumReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function CadastrarParceiro() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.get("email") as string,
      password: form.get("password") as string,
      options: {
        data: {
          full_name: form.get("full_name") as string,
          company_name: form.get("company_name") as string,
        },
      },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    router.push("/agency");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 48, padding: "0 16px", borderRadius: 12,
    background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
    color: WHITE, fontSize: 14, fontFamily: "var(--font-sans)", outline: "none",
    transition: "border-color 0.2s",
  };

  const BENEFITS = [
    "Setup completo em 48h — pronto para vender",
    "White-label 100% — sua marca, invisível para o cliente",
    "IA + WhatsApp API oficial incluso",
    "30 dias grátis para seus primeiros clientes testarem",
  ];

  return (
    <main style={{ background: BG, minHeight: "100dvh", display: "flex", fontFamily: "var(--font-sans)", overflowX: "hidden" }}>

      {/* ── LEFT PANEL — Power Offer ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden"
        style={{ borderRight: `1px solid ${BORDER}` }}>

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />

        {/* "85%" gigante — watermark dominante */}
        <div className="absolute pointer-events-none select-none font-black"
          style={{
            fontSize: "clamp(180px, 24vw, 300px)",
            color: `${GREEN}05`,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            right: -20,
            top: "50%",
            transform: "translateY(-50%)",
          }}>
          85%
        </div>

        {/* Green glow */}
        <div className="absolute pointer-events-none"
          style={{ background: `radial-gradient(ellipse 400px 300px at 30% 60%, ${GREEN}06, transparent)`, inset: 0 }} />

        {/* Logo */}
        <motion.div {...premiumReveal(0)} className="relative z-10">
          <Link href="/parceiros" className="inline-flex items-center gap-2.5" style={{ textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: WHITE, letterSpacing: "-0.01em" }}>Liberty CRM</span>
          </Link>
        </motion.div>

        {/* Offer content */}
        <motion.div {...premiumReveal(0.08)} className="relative z-10 space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}20` }}>
            <Zap size={11} style={{ color: GREEN }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: GREEN, textTransform: "uppercase" }}>
              Programa de Parceiros
            </span>
          </div>

          {/* Headline */}
          <div>
            <h1 style={{ fontSize: "clamp(32px, 3.2vw, 52px)", fontWeight: 900, color: WHITE, letterSpacing: "-0.05em", lineHeight: 1.0, marginBottom: 16 }}>
              R$97/mês.<br />
              <span style={{ background: `linear-gradient(90deg, ${GREEN} 0%, ${BLUE} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Você fica com 85%.
              </span>
            </h1>
            <p style={{ fontSize: 15, color: LIGHT, lineHeight: 1.65, maxWidth: 400 }}>
              Venda CRM com sua marca. Você define o preço. Liberty fica com apenas 15% — contra os 30% que os concorrentes cobram de você.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {BENEFITS.map((b, i) => (
              <motion.div key={b} {...premiumReveal(0.14 + i * 0.07)}
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <CheckCircle size={16} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 14, color: LIGHT, lineHeight: 1.5 }}>{b}</span>
              </motion.div>
            ))}
          </div>

          {/* Competitive advantage */}
          <motion.div {...premiumReveal(0.45)}>
            <div style={{ padding: "14px 18px", borderRadius: 14, background: `${GREEN}07`, border: `1px solid ${GREEN}18` }}>
              <p style={{ fontSize: 13, color: `${GREEN}90`, fontWeight: 600, lineHeight: 1.5 }}>
                Bolten cobra 30% de você. Nós ficamos com apenas 15%.<br />
                <span style={{ color: WHITE, fontWeight: 700 }}>Sua margem é 2× maior aqui.</span>
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <p className="relative z-10" style={{ fontSize: 11, color: "rgba(100,116,139,0.4)" }}>
          © {new Date().getFullYear()} Liberty CRM · Todos os direitos reservados
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 28px", background: BG2 }}>
        <motion.div {...premiumReveal(0.18)} style={{ width: "100%", maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom: 32 }}>
            <Link href="/parceiros" className="inline-flex items-center gap-2.5" style={{ textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: WHITE }}>Liberty CRM</span>
            </Link>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: `${GREEN}70`, textTransform: "uppercase", marginBottom: 8 }}>
              Seja um Parceiro
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: "-0.04em", marginBottom: 6 }}>
              Criar sua conta grátis
            </h2>
            <p style={{ fontSize: 14, color: MUTED }}>30 dias grátis. Sem cartão de crédito.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6 }}>Nome completo *</label>
                <input name="full_name" type="text" placeholder="Seu nome" required autoComplete="name"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = GREEN)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6 }}>Agência *</label>
                <input name="company_name" type="text" placeholder="Nome da agência" required autoComplete="organization"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = GREEN)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6 }}>Email *</label>
              <input name="email" type="email" placeholder="seu@email.com" required autoComplete="email"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = GREEN)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6 }}>Senha *</label>
              <div style={{ position: "relative" }}>
                <input name="password" type={showPw ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={e => (e.currentTarget.style.borderColor = GREEN)}
                  onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: MUTED, cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: 13, lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              animate={!loading ? {
                boxShadow: [
                  "0 0 20px rgba(34,197,94,0.20)",
                  "0 0 50px rgba(34,197,94,0.45)",
                  "0 0 20px rgba(34,197,94,0.20)",
                ]
              } : {}}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "100%", height: 52, borderRadius: 14, marginTop: 4,
                background: GRAD, color: "#000",
                fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.65 : 1, transition: "opacity 0.2s",
              }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  Criando conta...
                </span>
              ) : (
                <>Criar conta grátis <ArrowRight size={18} /></>
              )}
            </motion.button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: MUTED, marginTop: 20 }}>
            Já tem conta?{" "}
            <Link href="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
          </p>

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(100,116,139,0.4)", marginTop: 24 }}>
            Ao criar sua conta, você concorda com os{" "}
            <Link href="/termos" style={{ color: "rgba(100,116,139,0.6)", textDecoration: "none" }}>Termos de Uso</Link>
          </p>
        </motion.div>
      </div>

    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ background: BG, minHeight: "100dvh" }} />}>
      <CadastrarParceiro />
    </Suspense>
  );
}
