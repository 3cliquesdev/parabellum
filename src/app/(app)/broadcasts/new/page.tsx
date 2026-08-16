"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users, Check, Upload, MessageSquare, Kanban, Database, FileSpreadsheet } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const LEAD_FIELDS = [
  { id: "nome", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "servico_interesse", label: "Serviço" },
];

const STEPS = ["Template", "Segmento", "Variáveis", "Revisar"];

const FONTES = [
  {
    id: "inbox_24h",
    icon: MessageSquare,
    label: "Inbox ativo (24h)",
    desc: "Leads que mandaram mensagem hoje. Dentro da janela de 24h — sem template, texto livre, gratuito.",
    badge: "Grátis · Sem template",
    cor: "#10B981",
    destaque: true,
  },
  {
    id: "pipeline",
    icon: Kanban,
    label: "Pipeline (Kanban)",
    desc: "Leads cadastrados no CRM filtrados por etapa. Requer template aprovado.",
    badge: "Requer template",
    cor: "#60a5fa",
  },
  {
    id: "todos",
    icon: Database,
    label: "Todos os leads",
    desc: "Toda a base de contatos com WhatsApp cadastrado.",
    badge: "Requer template",
    cor: "#a78bfa",
  },
  {
    id: "csv",
    icon: FileSpreadsheet,
    label: "Importar planilha",
    desc: "Sobe um CSV ou Excel com colunas: nome, telefone. Ideal para bases externas.",
    badge: "Requer template",
    cor: "#fb923c",
  },
];

interface BroadcastTemplate {
  id: string;
  template_name: string;
  category: string;
  body_text: string;
  status: string;
  variables_count: number;
}

interface BroadcastPreview {
  total: number;
  com_whatsapp: number;
  opted_out: number;
  elegiveis: number;
  fonte: string;
  janela_gratuita: boolean;
}

interface BroadcastSegmentFilters {
  fonte: string;
  status: string[];
  csv_phones?: string[];
  csv_names?: string[];
}

interface BroadcastFormState {
  nome: string;
  template_id: string;
  template_variables: Record<string, string>;
  segmento_filtros: BroadcastSegmentFilters;
}

export default function NewBroadcastPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [starting, setStarting] = useState(false);
  const [csvData, setCsvData] = useState<{ phones: string[]; names: string[] }>({ phones: [], names: [] });
  const [form, setForm] = useState<BroadcastFormState>({
    nome: "",
    template_id: "",
    template_variables: {},
    segmento_filtros: { fonte: "pipeline", status: [] },
  });

  const cardStyle = { background: "var(--surface-gradient)", border: "1px solid var(--border-subtle)" };
  const selectedTemplate = templates.find(t => t.id === form.template_id);
  const varCount = selectedTemplate?.variables_count ?? 0;
  const varNumbers = Array.from({ length: varCount }, (_, i) => String(i + 1));
  const fonte = form.segmento_filtros.fonte;
  const isInbox24h = fonte === "inbox_24h";

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/broadcast/templates?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(d => setTemplates(((d.templates ?? []) as unknown as BroadcastTemplate[]).filter((template) => template.status === "approved")));
  }, [tenantId]);

  async function loadPreview() {
    if (!tenantId) return;
    const filtros: BroadcastSegmentFilters = { ...form.segmento_filtros };
    if (fonte === "csv") { filtros.csv_phones = csvData.phones; filtros.csv_names = csvData.names; }
    const r = await fetch(`/api/broadcast/campaigns/undefined/preview`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, segmento_filtros: filtros }),
    });
    if (r.ok) setPreview(await r.json());
  }

  function handleCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const phones: string[] = [], names: string[] = [];
      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes("nome")) return; // skip header
        const cols = line.split(/[,;|\t]/);
        const phone = cols.find(c => c.replace(/\D/g, "").length >= 10)?.replace(/\D/g, "") ?? "";
        const name = cols.find(c => c.trim().length > 2 && !/^\d/.test(c.trim()))?.trim() ?? "";
        if (phone) { phones.push(phone); names.push(name); }
      });
      setCsvData({ phones, names });
    };
    reader.readAsText(file);
  }

  async function createAndStart() {
    if (!tenantId) return;
    setStarting(true);
    const filtros: BroadcastSegmentFilters = { ...form.segmento_filtros };
    if (fonte === "csv") { filtros.csv_phones = csvData.phones; filtros.csv_names = csvData.names; }

    const r = await fetch("/api/broadcast/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, nome: form.nome, template_id: isInbox24h ? null : form.template_id, template_variables: form.template_variables, segmento_filtros: filtros }),
    });
    const { campaign } = await r.json();
    if (!campaign) { setStarting(false); return; }

    const r2 = await fetch(`/api/broadcast/campaigns/${campaign.id}/start`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId }),
    });
    setStarting(false);
    if (r2.ok) router.push("/broadcasts");
    else { const e = await r2.json(); alert(e.error ?? "Erro ao disparar"); }
  }

  const canNext0 = form.nome && (isInbox24h || form.template_id);
  const canNext1 = fonte === "csv" ? csvData.phones.length > 0 : true;

  return (
    <div className="p-8 max-w-2xl space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <Link href="/broadcasts" className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>
      <div>
        <h1 className="text-lg font-semibold text-white tracking-[-0.03em]">Nova campanha</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Disparo em massa via WhatsApp</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={i < step ? { background: "#10B981", color: "#0a0a0a" } : i === step ? { background: "rgba(16,185,129,0.2)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: i === step ? "#fff" : "#939da4" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
          </div>
        ))}
      </div>

      {/* ── PASSO 0: Nome + Fonte + Template ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Nome da campanha</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Promoção de Junho, Follow-up Leads Quentes..."
              className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
          </div>

          {/* Seleção de fonte */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Para quem vai o disparo?</label>
            {FONTES.map(f => {
              const Icon = f.icon;
              const selected = fonte === f.id;
              return (
                <button key={f.id} onClick={() => setForm(fm => ({ ...fm, segmento_filtros: { ...fm.segmento_filtros, fonte: f.id } }))}
                  className="w-full p-4 rounded-xl text-left transition-all"
                  style={selected ? { background: `${f.cor}08`, border: `1px solid ${f.cor}35` } : cardStyle}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${f.cor}15` }}>
                      <Icon className="w-4 h-4" style={{ color: f.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-white">{f.label}</p>
                        {f.destaque && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "var(--status-ganho)" }}>
                            Recomendado
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                          {f.badge}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template — só se não for inbox_24h */}
          {!isInbox24h && (
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Template aprovado pela Meta</label>
              {templates.length === 0 ? (
                <div className="p-4 rounded-xl text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Nenhum template aprovado.</p>
                  <Link href="/broadcasts/templates" className="text-xs font-bold mt-1 block" style={{ color: "var(--status-ganho)" }}>Cadastrar templates →</Link>
                </div>
              ) : templates.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, template_id: t.id }))}
                  className="w-full p-4 rounded-xl text-left"
                  style={form.template_id === t.id ? { ...cardStyle, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)" } : cardStyle}>
                  <div className="flex justify-between mb-1"><p className="text-sm font-bold text-white font-mono">{t.template_name}</p><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)" }}>{t.category}</span></div>
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{t.body_text}</p>
                </button>
              ))}
            </div>
          )}

          {isInbox24h && (
            <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--status-ganho)" }}>Janela de 24 horas ativa</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Dentro da janela de atendimento da Meta, você pode enviar qualquer texto sem template aprovado e sem custo por mensagem.</p>
            </div>
          )}

          <button onClick={() => setStep(1)} disabled={!canNext0}
            className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: "#10B981", color: "#0a0a0a", opacity: !canNext0 ? 0.4 : 1 }}>
            Próximo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── PASSO 1: Segmento/Filtros ── */}
      {step === 1 && (
        <div className="space-y-4">
          {fonte === "pipeline" && (
            <>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Filtrar por status no pipeline (deixe vazio para todos):</p>
              <div className="flex flex-wrap gap-2">
                {["novo","em_contato","qualificado","proposta","negociacao"].map(s => {
                  const sel = (form.segmento_filtros.status ?? []).includes(s);
                  return (
                    <button key={s} onClick={() => {
                      const curr = form.segmento_filtros.status ?? [];
                      setForm(f => ({ ...f, segmento_filtros: { ...f.segmento_filtros, status: sel ? curr.filter((x: string) => x !== s) : [...curr, s] } }));
                    }}
                      className="px-3 h-7 rounded-full text-xs font-medium transition-all capitalize"
                      style={sel ? { background: "rgba(16,185,129,0.15)", color: "var(--status-ganho)", border: "1px solid rgba(16,185,129,0.3)" }
                        : { background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                      {s.replace("_", " ")}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {fonte === "inbox_24h" && (
            <div className="rounded-xl p-4" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#60a5fa" }}>Leads com conversa ativa nas últimas 24h</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Serão incluídos todos os leads que mandaram mensagem pelo WhatsApp nas últimas 24 horas.</p>
            </div>
          )}

          {fonte === "todos" && (
            <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#a78bfa" }}>Toda a base de leads</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Todos os leads com número de WhatsApp cadastrado receberão a campanha.</p>
            </div>
          )}

          {fonte === "csv" && (
            <div className="space-y-3">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Faça upload do arquivo CSV ou Excel:</p>
              <div className="rounded-xl p-6 text-center border-dashed cursor-pointer transition-all"
                style={{ border: csvData.phones.length > 0 ? "2px dashed rgba(16,185,129,0.4)" : "2px dashed rgba(255,255,255,0.1)" }}
                onClick={() => fileRef.current?.click()}>
                {csvData.phones.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold" style={{ color: "var(--status-ganho)" }}>{csvData.phones.length}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>números importados</p>
                    <button className="text-xs mt-2 font-medium" style={{ color: "var(--text-secondary)" }} onClick={e => { e.stopPropagation(); setCsvData({ phones: [], names: [] }); }}>Trocar arquivo</button>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(147,157,164,0.4)" }} />
                    <p className="text-sm font-medium text-white">Clique para selecionar</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>CSV ou Excel com colunas nome e telefone</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCSV(f); }} />
              {csvData.phones.length > 0 && (
                <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xs font-bold text-white">Prévia (primeiros 3):</p>
                  {csvData.phones.slice(0, 3).map((phone, i) => (
                    <p key={i} className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{csvData.names[i] || "—"} · {phone}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview de elegíveis */}
          <button onClick={loadPreview} className="w-full h-9 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
            Calcular leads elegíveis
          </button>

          {preview && (
            <div className="rounded-xl p-4 grid grid-cols-3 gap-3" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
              <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Com WhatsApp</p><p className="text-xl font-bold text-white">{preview.com_whatsapp}</p></div>
              <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Opt-outs</p><p className="text-xl font-bold" style={{ color: "#f87171" }}>{preview.opted_out}</p></div>
              <div><p className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>Elegíveis</p><p className="text-lg font-semibold" style={{ color: "var(--status-ganho)" }}>{preview.elegiveis}</p></div>
              {preview.janela_gratuita && (
                <div className="col-span-3 pt-2" style={{ borderTop: "1px solid rgba(16,185,129,0.1)" }}>
                  <p className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>Dentro da janela de 24h — envio gratuito, sem template necessário</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>Voltar</button>
            <button onClick={() => setStep(2)} disabled={!canNext1}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#10B981", color: "#0a0a0a", opacity: !canNext1 ? 0.4 : 1 }}>
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2: Variáveis do template ── */}
      {step === 2 && (
        <div className="space-y-4">
          {isInbox24h ? (
            <div className="space-y-3">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Mensagem (texto livre — janela 24h)</label>
              <textarea value={form.template_variables["mensagem_livre"] ?? ""} onChange={e => setForm(f => ({ ...f, template_variables: { mensagem_livre: e.target.value } }))}
                rows={5} placeholder="Olá {{nome}}! Temos uma novidade especial para você..."
                className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }} />
              <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>Use {`{{nome}}`} para personalizar com o nome do lead</p>
            </div>
          ) : varCount === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-secondary)" }}>Este template não tem variáveis.</p>
          ) : varNumbers.map(num => (
            <div key={num} className="space-y-1.5">
              <label className="text-xs font-medium text-white">{`{{${num}}}`} → campo do lead</label>
              <select value={form.template_variables[num] ?? ""} onChange={e => setForm(f => ({ ...f, template_variables: { ...f.template_variables, [num]: e.target.value } }))}
                className="w-full h-9 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Selecionar campo...</option>
                {LEAD_FIELDS.map(f => <option key={f.id} value={f.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{f.label}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>Voltar</button>
            <button onClick={() => setStep(3)} className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "#10B981", color: "#0a0a0a" }}>
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 3: Revisar e disparar ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
            <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Resumo da campanha</p>
            {[
              { label: "Nome", value: form.nome },
              { label: "Fonte", value: FONTES.find(f => f.id === fonte)?.label },
              { label: "Template", value: isInbox24h ? "Texto livre (janela 24h)" : selectedTemplate?.template_name },
              { label: "Leads elegíveis", value: preview?.elegiveis ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>Atenção</p>
            <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
              {!isInbox24h && <li>• Template deve estar aprovado pela Meta</li>}
              <li>• Leads que responderam &quot;PARAR&quot; sao excluidos automaticamente</li>
              {isInbox24h && <li>• Válido apenas para quem conversou nas últimas 24h</li>}
            </ul>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>Voltar</button>
            <button onClick={createAndStart} disabled={starting}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#10B981", color: "#0a0a0a", opacity: starting ? 0.6 : 1 }}>
              {starting ? "Disparando..." : <><Users className="w-4 h-4" /> Disparar agora</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
