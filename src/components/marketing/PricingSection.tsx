import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "97",
    description: "Para freelancers e pequenos times",
    features: [
      "1 workspace",
      "Até 500 leads",
      "Pipeline visual",
      "Gestão de atividades",
      "Suporte por e-mail",
    ],
    cta: "Começar grátis",
    featured: false,
  },
  {
    name: "Pro",
    price: "197",
    description: "Para agências em crescimento",
    features: [
      "3 workspaces",
      "Leads ilimitados",
      "Inbox com IA",
      "Analytics avançado",
      "Integrações (WhatsApp, Meta)",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    featured: true,
  },
  {
    name: "Agency",
    price: "397",
    description: "Para agências que gerenciam múltiplos clientes",
    features: [
      "Workspaces ilimitados",
      "Leads ilimitados",
      "White-label",
      "API access",
      "Onboarding dedicado",
      "Suporte via WhatsApp",
    ],
    cta: "Falar com vendas",
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planos simples e transparentes
          </h2>
          <p className="text-white/50">Cancele quando quiser. Sem taxas escondidas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "rounded-2xl p-6 flex flex-col relative",
                plan.featured
                  ? "bg-blue-500/10 border border-blue-500/30 glow-blue"
                  : "glass"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 rounded-full text-xs font-medium text-white">
                  Mais popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-white/40 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-white/40">R$</span>
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-xs text-white/40">/mês</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={cn(
                  buttonVariants(),
                  "w-full rounded-xl h-10 text-sm font-medium justify-center",
                  plan.featured
                    ? "bg-blue-500 hover:bg-blue-400 text-white"
                    : "bg-white/8 hover:bg-white/12 text-white"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
