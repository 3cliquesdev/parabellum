"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/ia/agents":    "Agentes",
  "/ia/knowledge": "Base de Conhecimento",
  "/ia/training":  "Treinamento",
  "/ia/responses": "Respostas Rápidas",
  "/ia/sandbox":   "Sandbox",
  "/ia/feedback":  "Feedback",
  "/ia/flows":     "Chat Flows",
};

export default function IALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === "/ia";

  const directName = PAGE_NAMES[pathname];
  const isFlowsSubpage = pathname.startsWith("/ia/flows/") && pathname !== "/ia/flows";
  const pageName = directName ?? (isFlowsSubpage ? "Chat Flows" : null);
  const backLink = isFlowsSubpage ? "/ia/flows" : "/ia";
  const backLabel = isFlowsSubpage ? "Chat Flows" : "Studio IA";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "var(--font-sans)" }}>
      {!isHub && pageName && (
        <div className="flex items-center gap-2 px-8 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-subtle)" }}>
          <Link href={backLink}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
            {backLabel}
          </Link>
          {!isFlowsSubpage && (
            <>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>/</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{pageName}</span>
            </>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}
