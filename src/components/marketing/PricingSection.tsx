import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "97",
    description: "Para freelancers e pequenos times",
    features: ["1 workspace", "Até 500 leads", "Pipeline visual", "Gestão de atividades", "Suporte por e-mail"],
    cta: "Começar grátis",
    featured: false,
  },
  {
    name: "Pro",
    price: "197",
    description: "Para agências em crescimento",
    features: ["3 workspaces", "Leads ilimitados", "Inbox com IA", "Analytics avançado", "Integrações WhatsApp e Meta", "Suporte prioritário"],
    cta: "Assinar Pro",
    featured: true,
  },
  {
    name: "Agency",
    price: "397",
    description: "Para agências com múltiplos clientes",
    features: ["Workspaces ilimitados", "Leads ilimitados", "White-label", "Acesso à API", "Onboarding dedicado", "Suporte via WhatsApp"],
    cta: "Falar com vendas",
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="planos" className="py-32 px-6" style={{ background: "#000000" }}>
      <div className="max-w-[1000px] mx-auto">

        <div className="mb-20">
          <p className="section-label mb-4">Planos</p>
          <h2 className="text-[42px] md:text-[52px] font-extrabold text-white leading-[1.05] tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-sans)" }}>
            Simples e{" "}
            <span className="font-serif italic font-normal" style={{ color: "#f9f6ec" }}>
              transparente
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name}
              className="flex flex-col p-8 rounded-[28px] relative"
              style={plan.featured ? {
                background: "rgba(154,234,98,0.05)",
                border: "1px solid rgba(154,234,98,0.2)",
              } : {
                background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>

              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                  style={{ background: "#9aea62", color: "#0a0a0a" }}>
                  Mais popular
                </div>
              )}

              <div className="mb-8">
                <p className="text-xs font-bold mb-1" style={{ color: "#939da4", letterSpacing: "0.05em" }}>
                  {plan.name.toUpperCase()}
                </p>
                <p className="text-sm mb-5" style={{ color: "#939da4" }}>{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm" style={{ color: "#939da4" }}>R$</span>
                  <span className="text-4xl font-extrabold text-white tracking-[-0.03em]">{plan.price}</span>
                  <span className="text-sm" style={{ color: "#939da4" }}>/mês</span>
                </div>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#f9f6ec" }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(154,234,98,0.15)" }}>
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="#9aea62" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/signup"
                className={cn(
                  "inline-flex items-center justify-center px-6 py-3 rounded-[500px] text-sm font-bold transition-all duration-150",
                  plan.featured
                    ? "btn-lime"
                    : "btn-ghost-pill text-white"
                )}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-8" style={{ color: "#939da4" }}>
          Cancele quando quiser. Sem taxas escondidas.
        </p>
      </div>
    </section>
  );
}
