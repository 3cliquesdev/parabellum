import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#000000" }}>
      <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#9aea62" }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">Liberty CRM</span>
        </Link>

        <div className="flex items-center gap-8">
          <Link href="/privacidade" className="footer-link text-xs">Privacidade</Link>
          <Link href="/termos" className="footer-link text-xs">Termos</Link>
          <Link href="/contato" className="footer-link text-xs">Contato</Link>
        </div>

        <p className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>
          © 2026 Liberty CRM
        </p>
      </div>
    </footer>
  );
}
