"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default function InboxPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(154,234,98,0.08)", border: "1px solid rgba(154,234,98,0.15)" }}>
        <MessageSquare className="w-7 h-7" style={{ color: "#9aea62" }} />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-extrabold text-white tracking-[-0.02em]">Inbox IA</h1>
        <p className="text-sm mt-2 max-w-sm" style={{ color: "#939da4" }}>
          O inbox com IA estará disponível em breve. Respostas automáticas via WhatsApp integradas ao pipeline.
        </p>
      </div>
      <Link href="/pipeline"
        className="px-5 h-9 rounded-xl text-sm font-bold inline-flex items-center"
        style={{ background: "#9aea62", color: "#0a0a0a" }}>
        Ir para o Pipeline
      </Link>
    </div>
  );
}
