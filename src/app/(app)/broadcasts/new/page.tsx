"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users, Check } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const LEAD_FIELDS = [
  { id: "nome", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "servico_interesse", label: "Serviço de interesse" },
];

const STEPS = ["Template", "Variáveis", "Segmento", "Revisar e disparar"];

export default function NewBroadcastPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ total: number; com_whatsapp: number; opted_out: number; elegiveis: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [form, setForm] = useState({
    nome: "", template_id: "", template_variables: {} as Record<string, string>,
    segmento_filtros: {} as Record<string, any>,
  });

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/broadcast/templates?tenant_id=${tenantId}`)
      .then(r => r.json()).then(d => setTemplates((d.templates ?? []).filter((t: any) => t.status === "approved")));
  }, [tenantId]);

  const selectedTemplate = templates.find(t => t.id === form.template_id);
  const varCount = selectedTemplate?.variables_count ?? 0;
  const varNumbers = Array.from({ length: varCount }, (_, i) => String(i + 1));

  async function loadPreview() {
    if (!tenantId || !form.template_id) return;
    const r = await fetch(`/api/broadcast/campaigns/preview/route`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, segmento_filtros: form.segmento_filtros }),
    });
    // Use the preview endpoint directly
    const r2 = await fetch(`/api/broadcast/campaigns/undefined/preview`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, segmento_filtros: form.segmento_filtros }),
    });
    if (r2.ok) setPreview(await r2.json());
  }

  async function createAndStart() {
    if (!tenantId) return;
    setStarting(true);
    // Criar campanha
    const r = await fetch("/api/broadcast/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, nome: form.nome, template_id: form.template_id, template_variables: form.template_variables, segmento_filtros: form.segmento_filtros }),
    });
    const { campaign } = await r.json();
    if (!campaign) { setStarting(false); return; }
    // Disparar
    const r2 = await fetch(`/api/broadcast/campaigns/${campaign.id}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId }) });
    setStarting(false);
    if (r2.ok) router.push("/broadcasts");
    else { const e = await r2.json(); alert(e.error ?? "Erro ao disparar"); }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-center gap-3">
        <Link href="/broadcasts" className="flex items-center gap-1.5 text-xs" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Nova campanha</h1>
        <p className="text-sm mt-1" style={{ color: "#939da4" }}>Disparo em massa via WhatsApp</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={i < step ? { background: "#9aea62", color: "#0a0a0a" } : i === step ? { background: "rgba(154,234,98,0.2)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.3)" } : { background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-xs font-medium" style={{ color: i === step ? "#fff" : "#939da4" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Template */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>Nome da campanha</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Promoção de Junho" className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "#939da4" }}>Template (somente aprovados)</label>
            {templates.length === 0 ? (
              <div className="p-4 rounded-xl text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p className="text-xs" style={{ color: "#939da4" }}>Nenhum template aprovado.</p>
                <Link href="/broadcasts/templates" className="text-xs font-bold mt-1 block" style={{ color: "#9aea62" }}>
                  Cadastrar templates →
                </Link>
              </div>
            ) : templates.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, template_id: t.id }))}
                className="w-full p-4 rounded-xl text-left transition-all"
                style={form.template_id === t.id
                  ? { ...cardStyle, border: "1px solid rgba(154,234,98,0.3)", background: "rgba(154,234,98,0.05)" }
                  : cardStyle}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold text-white font-mono">{t.template_name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)" }}>{t.category}</span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "#939da4" }}>{t.body_text}</p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(147,157,164,0.5)" }}>{t.variables_count} variável(is)</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} disabled={!form.nome || !form.template_id}
            className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: "#9aea62", color: "#0a0a0a", opacity: (!form.nome || !form.template_id) ? 0.4 : 1 }}>
            Próximo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Variáveis */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "#939da4" }}>Mapeie cada variável do template para um campo do lead:</p>
          {varNumbers.map(num => (
            <div key={num} className="space-y-1.5">
              <label className="text-xs font-medium text-white">{`{{${num}}}`} → campo do lead</label>
              <select value={form.template_variables[num] ?? ""} onChange={e => setForm(f => ({ ...f, template_variables: { ...f.template_variables, [num]: e.target.value } }))}
                className="w-full h-9 px-3 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
                <option value="" style={{ background: "#111" }}>Selecionar campo...</option>
                {LEAD_FIELDS.map(f => <option key={f.id} value={f.id} style={{ background: "#111" }}>{f.label}</option>)}
              </select>
            </div>
          ))}
          {varCount === 0 && <p className="text-xs py-4 text-center" style={{ color: "#939da4" }}>Este template não tem variáveis.</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Voltar</button>
            <button onClick={() => { setStep(2); loadPreview(); }}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Segmento */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs font-medium" style={{ color: "#939da4" }}>Filtrar leads por status (deixe vazio para todos):</p>
          <div className="flex flex-wrap gap-2">
            {["novo","em_contato","qualificado","proposta","negociacao"].map(s => {
              const selected = (form.segmento_filtros.status ?? []).includes(s);
              return (
                <button key={s} onClick={() => {
                  const curr = form.segmento_filtros.status ?? [];
                  setForm(f => ({ ...f, segmento_filtros: { ...f.segmento_filtros, status: selected ? curr.filter((x: string) => x !== s) : [...curr, s] } }));
                  loadPreview();
                }}
                  className="px-3 h-7 rounded-full text-xs font-medium transition-all"
                  style={selected ? { background: "rgba(154,234,98,0.15)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", color: "#939da4", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {s}
                </button>
              );
            })}
          </div>

          {preview && (
            <div className="rounded-xl p-4 grid grid-cols-2 gap-3" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.12)" }}>
              <div><p className="text-xs" style={{ color: "#939da4" }}>Com WhatsApp</p><p className="text-lg font-bold text-white">{preview.com_whatsapp}</p></div>
              <div><p className="text-xs" style={{ color: "#939da4" }}>Opt-outs</p><p className="text-lg font-bold" style={{ color: "#f87171" }}>{preview.opted_out}</p></div>
              <div className="col-span-2 pt-2" style={{ borderTop: "1px solid rgba(154,234,98,0.1)" }}>
                <p className="text-xs" style={{ color: "#939da4" }}>Leads elegíveis</p>
                <p className="text-2xl font-extrabold" style={{ color: "#9aea62" }}>{preview.elegiveis}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Voltar</button>
            <button onClick={() => setStep(3)} disabled={preview?.elegiveis === 0}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: preview?.elegiveis === 0 ? 0.4 : 1 }}>
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Revisar */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
            <p className="text-xs font-bold" style={{ color: "#939da4" }}>Resumo da campanha</p>
            {[
              { label: "Nome", value: form.nome },
              { label: "Template", value: selectedTemplate?.template_name },
              { label: "Leads elegíveis", value: preview?.elegiveis ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-xs" style={{ color: "#939da4" }}>{label}</span>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>Atenção antes de disparar:</p>
            <ul className="text-xs space-y-1" style={{ color: "#939da4" }}>
              <li>• Template deve estar aprovado pela Meta</li>
              <li>• Leads que responderam "PARAR" serão excluídos automaticamente</li>
              <li>• Mensagens MARKETING exigem opt-out — tenha botão "Não tenho interesse"</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Voltar</button>
            <button onClick={createAndStart} disabled={starting}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: starting ? 0.6 : 1 }}>
              {starting ? "Disparando..." : <><Users className="w-4 h-4" /> Disparar agora</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
