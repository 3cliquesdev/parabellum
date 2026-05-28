import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/6 py-10 px-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Liberty CRM</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/privacidade" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Privacidade
          </Link>
          <Link href="/termos" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Termos
          </Link>
        </div>

        <p className="text-xs text-white/20">© 2026 Liberty CRM. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
