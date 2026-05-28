"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useLeads, useUpdateLeadStatus } from "@/hooks/useLeads";
import { KanbanBoard } from "@/components/app/pipeline/KanbanBoard";
import { AddLeadModal } from "@/components/app/pipeline/AddLeadModal";
import type { LeadStatus } from "@/types/database";

export default function PipelinePage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { leads, loading: leadsLoading, refetch } = useLeads(tenantId);
  const { updateStatus } = useUpdateLeadStatus();
  const [showAddModal, setShowAddModal] = useState(false);

  const totalValue = leads
    .filter((l) => l.status !== "perdido")
    .reduce((sum, l) => sum + Number(l.valor_estimado ?? 0), 0);

  const handleStatusChange = useCallback(async (leadId: string, status: LeadStatus) => {
    // Optimistic update
    await updateStatus(leadId, status);
    refetch();
  }, [updateStatus, refetch]);

  if (tenantLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-5" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Pipeline</h1>
          <p className="text-sm mt-0.5 font-medium" style={{ color: "#939da4" }}>
            {leads.length} leads · R$ {totalValue.toLocaleString("pt-BR")} no funil
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#939da4" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" />
            Novo lead
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        {tenantId && (
          <KanbanBoard
            leads={leads}
            onStatusChange={handleStatusChange}
            onLeadUpdated={refetch}
            tenantId={tenantId}
          />
        )}
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-white/40 text-sm">Nenhum lead ainda.</p>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a" }}>
              <Plus className="w-4 h-4" />
              Criar primeiro lead
            </button>
          </div>
        )}
      </div>

      {showAddModal && tenantId && (
        <AddLeadModal
          tenantId={tenantId}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); refetch(); }}
        />
      )}
    </div>
  );
}
