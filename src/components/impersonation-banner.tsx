"use client";

import { ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({ tenantName, agencyName }: { tenantName: string; agencyName: string }) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  async function endSession() {
    setEnding(true);
    await fetch("/api/agency/impersonation/end", { method: "POST" });
    router.push("/agency");
  }

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold z-50"
      style={{ background: "#facc15", color: "#0a0a0a", borderBottom: "2px solid #eab308" }}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>
          Modo suporte ativo — você está visualizando o workspace de{" "}
          <strong>{tenantName}</strong> como {agencyName}
        </span>
      </div>
      <button onClick={endSession} disabled={ending}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all"
        style={{ background: "rgba(0,0,0,0.15)", color: "#0a0a0a" }}>
        <X className="w-3.5 h-3.5" />
        {ending ? "Saindo..." : "Sair do modo suporte"}
      </button>
    </div>
  );
}
