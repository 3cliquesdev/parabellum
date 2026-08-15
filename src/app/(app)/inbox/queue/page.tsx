"use client";

import { useEffect, useState } from "react";
import { Clock, Users, Zap } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import { resolveConversationIdentity } from "@/lib/inbox/channels";
import {
  inboxBadgeStyle,
  inboxGhostButtonStyle,
  inboxPageStyle,
  inboxPanelStyle,
  inboxPrimaryButtonStyle,
  inboxSubtlePanelStyle,
} from "../theme";

function tempoNaFila(queuedAt: string) {
  const diff = Date.now() - new Date(queuedAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

interface QueueLead {
  nome?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
}

interface QueueConversation {
  id: string;
  canal?: "whatsapp" | "email" | "instagram" | "telegram" | "facebook_messenger" | "interno" | null;
  lead_id?: string | null;
  leads?: QueueLead | null;
}

interface DepartmentInfo {
  id: string;
  name: string;
  color: string;
}

interface QueueItem {
  id: string;
  conversa_id: string;
  department_id?: string | null;
  motivo?: string | null;
  prioridade: number;
  queued_at: string;
  conversas?: QueueConversation | null;
  departments?: DepartmentInfo | null;
}

export default function InboxQueuePage() {
  const { tenantId } = useTenant();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assuming, setAssuming] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const activeTenantId = tenantId;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setMyUserId(user?.id ?? null));

    async function load() {
      const { data } = await supabase
        .from("conversation_queue")
        .select("*, conversas(id, lead_id, canal, leads(nome, whatsapp, email, instagram)), departments(id, name, color)")
        .eq("tenant_id", activeTenantId)
        .is("assigned_at", null)
        .order("prioridade", { ascending: false })
        .order("queued_at", { ascending: true });

      setQueue((data ?? []) as unknown as QueueItem[]);
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel("queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_queue", filter: `tenant_id=eq.${activeTenantId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  async function assumir(item: QueueItem) {
    if (!myUserId || !tenantId) return;
    setAssuming(item.id);
    const supabase = createClient();

    await supabase
      .from("conversas")
      .update({
        assigned_to: myUserId,
        dispatch_status: "atribuido",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", item.conversa_id);

    await supabase.from("conversation_queue").update({ assigned_at: new Date().toISOString() }).eq("id", item.id);
    await supabase
      .from("tenant_members")
      .update({ ultima_atribuicao: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("user_id", myUserId);

    setQueue((prev) => prev.filter((queueItem) => queueItem.id !== item.id));
    setAssuming(null);
  }

  const porDepartamento = new Map<string, { nome: string; cor: string; count: number }>();
  for (const item of queue) {
    const nome = item.departments?.name ?? "Sem departamento";
    const cor = item.departments?.color ?? "#60a5fa";
    const atual = porDepartamento.get(nome) ?? { nome, cor, count: 0 };
    atual.count += 1;
    porDepartamento.set(nome, atual);
  }
  const gruposDepartamento = Array.from(porDepartamento.values());

  return (
    <div className="p-6 space-y-6" style={inboxPageStyle}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            Fila de atendimento
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Conversas aguardando um atendente disponível antes de sair do piloto automático.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {gruposDepartamento.map((dept) => (
            <div key={dept.nome} className="px-3.5 py-2 rounded-xl text-xs font-bold" style={inboxBadgeStyle(dept.cor)}>
              {dept.count} {dept.nome}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] p-5" style={inboxPanelStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Em espera
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Conversas sem atribuição
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
              <Users className="w-5 h-5" style={{ color: "var(--status-ganho)" }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-[-0.03em] mt-5" style={{ color: "var(--text-primary)" }}>
            {queue.length}
          </p>
        </div>

        <div className="rounded-[24px] p-5" style={inboxPanelStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Alta prioridade
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Itens com prioridade elevada
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.18)" }}>
              <Zap className="w-5 h-5" style={{ color: "var(--status-perdido)" }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-[-0.03em] mt-5" style={{ color: "var(--text-primary)" }}>
            {queue.filter((item) => item.prioridade > 0).length}
          </p>
        </div>

        <div className="rounded-[24px] p-5" style={inboxPanelStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Próximo SLA
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Tempo de espera do item mais antigo
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
              <Clock className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-[-0.03em] mt-5" style={{ color: "var(--text-primary)" }}>
            {queue[0] ? tempoNaFila(queue[0].queued_at) : "-"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-[28px] py-16 text-center" style={inboxPanelStyle}>
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={inboxSubtlePanelStyle}>
            <Users className="w-7 h-7" style={{ color: "var(--text-faint)" }} />
          </div>
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Fila vazia
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Todos os leads estão sendo atendidos agora.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const lead = item.conversas?.leads;
            const dept = item.departments?.name ?? "Sem departamento";
            const deptColor = item.departments?.color ?? "#60a5fa";
            const identifier = resolveConversationIdentity(item.conversas?.canal ?? "interno", {
              whatsapp: lead?.whatsapp ?? null,
              email: lead?.email ?? null,
              instagram: lead?.instagram ?? null,
            });

            return (
              <div key={item.id} className="rounded-[24px] p-4 md:p-5" style={inboxPanelStyle}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${deptColor}18`, color: deptColor }}>
                      {(lead?.nome ?? "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {lead?.nome ?? "Lead desconhecido"}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={inboxBadgeStyle(deptColor)}>
                          {dept}
                        </span>
                        {item.prioridade > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={inboxBadgeStyle("#dc2626")}>
                            Alta prioridade
                          </span>
                        )}
                      </div>

                      <p className="text-sm mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                        {identifier}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
                          <Clock className="w-3.5 h-3.5" />
                          {tempoNaFila(item.queued_at)}
                        </div>
                        {item.motivo && (
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {item.motivo.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled
                      className="px-3.5 h-10 rounded-xl text-xs font-bold"
                      style={inboxGhostButtonStyle}
                    >
                      Em análise
                    </button>
                    <button
                      onClick={() => assumir(item)}
                      disabled={assuming === item.id}
                      className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-xs font-bold transition-all"
                      style={{
                        ...inboxPrimaryButtonStyle,
                        opacity: assuming === item.id ? 0.65 : 1,
                      }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {assuming === item.id ? "Assumindo..." : "Assumir"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
