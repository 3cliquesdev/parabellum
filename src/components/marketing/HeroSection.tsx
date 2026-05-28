import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden"
      style={{ background: "#000000" }}>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 40% at 50% 20%, rgba(154,234,98,0.06) 0%, transparent 70%)",
        }} />

      <div className="relative w-full max-w-[1000px] mx-auto text-center">

        {/* Label */}
        <p className="section-label mb-6">CRM para agências e times de vendas</p>

        {/* Headline */}
        <h1 className="text-[52px] md:text-[68px] font-extrabold text-white leading-[1.05] tracking-[-0.04em] mb-6"
          style={{ fontFamily: "var(--font-sans)" }}>
          Feche mais negócios com um{" "}
          <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>
            CRM inteligente
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-[17px] leading-[1.6] max-w-[540px] mx-auto mb-10"
          style={{ color: "#939da4", fontWeight: 400 }}>
          Pipeline visual, gestão de leads, atividades e inbox com IA. Tudo que sua agência precisa para vender mais.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup"
            className="btn-lime inline-flex items-center px-7 py-3.5 text-[14px]">
            Começar grátis
          </Link>
          <Link href="#features"
            className="btn-ghost-pill inline-flex items-center px-7 py-3.5 text-[14px] text-white"
            style={{ fontWeight: 500 }}>
            Ver funcionalidades
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-8 text-xs" style={{ color: "rgba(147,157,164,0.6)" }}>
          Sem cartão de crédito. Configuração em 2 minutos.
        </p>

        {/* Product preview */}
        <div className="mt-20 card-dark rounded-[28px] overflow-hidden">
          <div className="flex items-center gap-1.5 px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
          </div>
          <div className="grid grid-cols-4 gap-4 p-8">
            {["Novo", "Em Contato", "Proposta", "Fechado"].map((col, i) => (
              <div key={col}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold" style={{ color: "#939da4" }}>{col}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>
                    {[4, 2, 3, 1][i]}
                  </span>
                </div>
                {Array.from({ length: i === 3 ? 1 : 2 }).map((_, j) => (
                  <div key={j} className="mb-3 p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.1)", width: "70%" }} />
                    <div className="h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)", width: "50%" }} />
                    <div className="flex items-center justify-between mt-3">
                      <div className="h-5 w-5 rounded-full" style={{ background: "rgba(154,234,98,0.2)" }} />
                      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)", width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
