"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Shield, Clock, Users } from "lucide-react";

const BG = "#040405";
const BG2 = "#090B10";
const CARD = "#111318";
const BORDER = "#252A33";
const WHITE = "#F8FAFC";
const MUTED = "#A1A1AA";
const SOFT = "#71717A";
const CHAMP = "#D6B36A";
const GOLD = "#C8A75D";
const BLUE = "#2563EB";

const premiumReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const EQUIPE_OPTIONS = [
  "Somente eu",
  "2 a 5 pessoas",
  "6 a 20 pessoas",
  "21 a 50 pessoas",
  "Mais de 50 pessoas",
];

export default function AgendarApresentacaoPage() {
  const [form, setForm] = useState({ nome: "", empresa: "", email: "", telefone: "", equipe: "", instagram: "", site: "", observacoes: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) { setError("Preencha nome e email."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/opus/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao enviar. Tente novamente."); return; }
      setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    background: BG2, border: `1px solid ${BORDER}`,
    color: WHITE, fontSize: 14, fontFamily: "var(--font-sans)",
    outline: "none", transition: "border-color 0.2s",
  };

  return (
    <main style={{ background: BG, minHeight: "100vh", fontFamily: "var(--font-sans)", color: WHITE, overflowX: "hidden" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: CHAMP }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#000" /></svg>
          </div>
          <span className="font-bold text-sm" style={{ color: WHITE, letterSpacing: "-0.01em" }}>Liberty CRM</span>
        </Link>
        <Link href="/opus" className="text-sm" style={{ color: SOFT, textDecoration: "none" }}>
          ← Voltar ao site
        </Link>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

        {/* Coluna esquerda — copy */}
        <motion.div {...premiumReveal(0)}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-bold uppercase tracking-widest"
            style={{ background: `${CHAMP}12`, border: `1px solid ${CHAMP}25`, color: CHAMP }}>
            Demonstração Exclusiva
          </div>

          <h1 className="font-extrabold leading-[1.0] mb-6"
            style={{ fontSize: "clamp(36px, 4vw, 56px)", letterSpacing: "-0.04em" }}>
            Veja o Opus funcionando{" "}
            <span className="font-serif italic font-normal" style={{ color: CHAMP }}>
              para a sua empresa
            </span>
          </h1>

          <p className="text-lg leading-relaxed mb-10" style={{ color: MUTED, maxWidth: 460 }}>
            Em uma apresentação de 45 minutos, mostramos como estruturamos um CRM exclusivo com sua marca, IA treinada e automações configuradas para o seu negócio.
          </p>

          <div className="space-y-5">
            {[
              { icon: CheckCircle, text: "Diagnóstico completo da sua operação" },
              { icon: Clock, text: "Apresentação em até 48h após o contato" },
              { icon: Shield, text: "100% white-label — sua marca, invisível para o cliente" },
              { icon: Users, text: "Proposta personalizada para o seu time" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <Icon size={17} style={{ color: CHAMP, marginTop: 2, flexShrink: 0 }} />
                <p className="text-sm" style={{ color: "#CBD5E1" }}>{text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Coluna direita — formulário */}
        <motion.div {...premiumReveal(0.15)}>
          <div className="rounded-[28px] p-8" style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          }}>
            {success ? (
              <motion.div {...premiumReveal(0)} className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: `${CHAMP}15`, border: `2px solid ${CHAMP}30` }}>
                  <CheckCircle size={32} style={{ color: CHAMP }} />
                </div>
                <h2 className="text-2xl font-extrabold mb-3" style={{ color: WHITE, letterSpacing: "-0.03em" }}>
                  Recebemos!
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: MUTED }}>
                  Entraremos em contato em até <strong style={{ color: WHITE }}>24 horas</strong> para agendar sua apresentação personalizada.
                </p>
                <Link href="/opus"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: `${CHAMP}12`, border: `1px solid ${CHAMP}25`, color: CHAMP, textDecoration: "none" }}>
                  Voltar ao site
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <p className="text-lg font-extrabold mb-1" style={{ color: WHITE, letterSpacing: "-0.02em" }}>
                    Agende sua apresentação
                  </p>
                  <p className="text-sm" style={{ color: SOFT }}>Preencha os dados abaixo</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Nome completo *</label>
                    <input
                      style={inputStyle}
                      placeholder="Seu nome"
                      value={form.nome}
                      onChange={set("nome")}
                      required
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Empresa</label>
                    <input
                      style={inputStyle}
                      placeholder="Nome da empresa"
                      value={form.empresa}
                      onChange={set("empresa")}
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Email corporativo *</label>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="seu@empresa.com"
                    value={form.email}
                    onChange={set("email")}
                    required
                    onFocus={e => (e.target.style.borderColor = CHAMP)}
                    onBlur={e => (e.target.style.borderColor = BORDER)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>WhatsApp</label>
                    <input
                      type="tel"
                      style={inputStyle}
                      placeholder="(11) 99999-9999"
                      value={form.telefone}
                      onChange={set("telefone")}
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Tamanho da equipe</label>
                    <select
                      style={{ ...inputStyle, cursor: "pointer" }}
                      value={form.equipe}
                      onChange={set("equipe")}
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    >
                      <option value="">Selecione</option>
                      {EQUIPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Instagram da empresa</label>
                    <input
                      style={inputStyle}
                      placeholder="@suaempresa"
                      value={form.instagram}
                      onChange={set("instagram")}
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Site (se tiver)</label>
                    <input
                      type="url"
                      style={inputStyle}
                      placeholder="www.suaempresa.com.br"
                      value={form.site}
                      onChange={set("site")}
                      onFocus={e => (e.target.style.borderColor = CHAMP)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Mensagem (opcional)</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                    placeholder="Descreva brevemente sua operação atual..."
                    value={form.observacoes}
                    onChange={set("observacoes")}
                    onFocus={e => (e.target.style.borderColor = CHAMP)}
                    onBlur={e => (e.target.style.borderColor = BORDER)}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  animate={!loading ? { boxShadow: ["0 0 20px rgba(214,179,106,0.20)", "0 0 40px rgba(214,179,106,0.42)", "0 0 20px rgba(214,179,106,0.20)"] } : {}}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all"
                  style={{
                    background: loading ? `${GOLD}80` : `linear-gradient(135deg, ${CHAMP}, #F4E3B2, ${GOLD})`,
                    color: "#0B0F14",
                    fontSize: 15, letterSpacing: "-0.01em",
                    cursor: loading ? "not-allowed" : "pointer",
                    border: "none",
                  }}>
                  {loading ? (
                    <span>Enviando...</span>
                  ) : (
                    <>Agendar apresentação estratégica <ArrowRight size={18} /></>
                  )}
                </motion.button>

                <p className="text-center text-xs" style={{ color: SOFT }}>
                  Sem compromisso • Resposta em até 24h
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
