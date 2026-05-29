"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/ia/agents":    "Agentes",
  "/ia/knowledge": "Base de Conhecimento",
  "/ia/training":  "Treinamento",
  "/ia/responses": "Respostas Rápidas",
  "/ia/sandbox":   "Sandbox",
  "/ia/feedback":  "Feedback",
};

export default function IALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === "/ia";
  const pageName = PAGE_NAMES[pathname];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Breadcrumb — só aparece nas sub-páginas */}
      {!isHub && pageName && (
        <div className="flex items-center gap-2 px-8 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
          <Link href="/ia"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-white"
            style={{ color: "#939da4" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
            Studio IA
          </Link>
          <span className="text-xs" style={{ color: "rgba(147,157,164,0.3)" }}>/</span>
          <span className="text-xs font-medium text-white">{pageName}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
