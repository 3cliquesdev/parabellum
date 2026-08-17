"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Send } from "lucide-react";

interface MetaTemplate {
  id: string;
  template_name: string;
  language_code: string;
  status: string;
  body_text: string;
  variables_count: number;
}

interface TemplatePickerModalProps {
  tenantId: string;
  conversaId?: string;
  leadId?: string;
  negocioId?: string;
  onClose: () => void;
  onEnviado: (conversaId: string) => void;
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export function TemplatePickerModal({ tenantId, conversaId, leadId, negocioId, onClose, onEnviado }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<MetaTemplate | null>(null);
  const [variaveis, setVariaveis] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/broadcast/templates?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(((d.templates ?? []) as MetaTemplate[]).filter((t) => t.status === "approved")))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function selecionar(template: MetaTemplate) {
    setSelecionado(template);
    setVariaveis({});
    setErro(null);
  }

  function preview(): string {
    if (!selecionado) return "";
    return selecionado.body_text.replace(/\{\{(\d+)\}\}/g, (_m, key: string) => variaveis[key] || `{{${key}}}`);
  }

  async function enviar() {
    if (!selecionado) return;
    setEnviando(true);
    setErro(null);
    const res = await fetch("/api/inbox/send-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        conversaId,
        leadId,
        negocioId,
        templateName: selecionado.template_name,
        languageCode: selecionado.language_code,
        variables: variaveis,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) {
      setErro(data.error ?? "Erro ao enviar template");
      return;
    }
    onEnviado(data.conversaId);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Enviar template do WhatsApp</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Carregando templates...</p>
          ) : templates.length === 0 ? (
            <div className="text-xs space-y-2" style={{ color: "var(--text-secondary)" }}>
              <p>Nenhum template aprovado ainda.</p>
              <p>
                Cadastre e aprove em{" "}
                <Link href="/broadcasts/templates" className="font-semibold underline" style={{ color: "var(--text-primary)" }}>
                  Broadcasts → Templates
                </Link>.
              </p>
            </div>
          ) : !selecionado ? (
            <div className="space-y-2">
              {templates.map((t) => (
                <button key={t.id} onClick={() => selecionar(t)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                  <p className="font-semibold font-mono">{t.template_name}</p>
                  <p className="mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{t.body_text}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setSelecionado(null)} className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                ← Escolher outro template
              </button>

              {Array.from({ length: selecionado.variables_count }, (_, i) => i + 1).map((n) => (
                <div key={n} className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Variável {`{{${n}}}`}</label>
                  <input value={variaveis[n] ?? ""} onChange={(e) => setVariaveis((v) => ({ ...v, [n]: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
              ))}

              <div className="rounded-lg p-3 text-xs" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Pré-visualização</p>
                {preview()}
              </div>

              {erro && <p className="text-xs font-medium" style={{ color: "#dc2626" }}>{erro}</p>}

              <button onClick={enviar} disabled={enviando}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: enviando ? 0.6 : 1 }}>
                <Send className="w-3.5 h-3.5" /> {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
