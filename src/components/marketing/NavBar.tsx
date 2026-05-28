"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 h-16 glass border-b border-white/6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">Liberty CRM</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        <Link href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Funcionalidades</Link>
        <Link href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors">Planos</Link>
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-white/60 hover:text-white hover:bg-white/8")}
        >
          Entrar
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "sm" }), "bg-blue-500 hover:bg-blue-400 text-white rounded-xl h-8 px-4 text-sm")}
        >
          Começar grátis
        </Link>
      </div>
    </header>
  );
}
