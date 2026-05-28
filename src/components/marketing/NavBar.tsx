"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 h-16"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-[#9aea62] flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
          </svg>
        </div>
        <span className="font-bold text-white text-sm tracking-tight" style={{ fontFamily: "var(--font-sans)" }}>
          Liberty CRM
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {["Funcionalidades", "Planos", "Blog"].map((item) => (
          <Link key={item} href={`#${item.toLowerCase()}`}
            className="text-sm text-[#939da4] hover:text-white transition-colors duration-150" style={{ fontWeight: 500 }}>
            {item}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <Link href="/login"
          className="text-sm text-[#939da4] hover:text-white transition-colors duration-150 px-4 py-2"
          style={{ fontWeight: 500 }}>
          Entrar
        </Link>
        <Link href="/signup"
          className="btn-lime text-sm px-5 py-2.5 inline-flex items-center"
          style={{ fontSize: "13px", fontWeight: 700 }}>
          Começar grátis
        </Link>
      </div>
    </header>
  );
}
