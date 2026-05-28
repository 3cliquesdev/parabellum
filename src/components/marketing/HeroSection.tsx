import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/6 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-400/5 blur-[60px]" />
      </div>

      <div className="relative text-center max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/10 text-xs text-white/60 mb-8">
          <Sparkles className="w-3 h-3 text-blue-400" />
          CRM com Inteligência Artificial
          <ArrowRight className="w-3 h-3" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Venda mais com um{" "}
          <span className="text-gradient-blue">CRM inteligente</span>
        </h1>

        <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
          Pipeline visual, gestão de leads, atividades e inbox com IA integrada.
          Tudo que sua agência precisa para fechar mais negócios.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-blue-500 hover:bg-blue-400 text-white rounded-2xl h-12 px-8 text-sm font-medium glow-blue transition-all duration-200 inline-flex items-center gap-2"
            )}
          >
            Começar grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#features"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "text-white/60 hover:text-white hover:bg-white/8 rounded-2xl h-12 px-8 text-sm"
            )}
          >
            Ver funcionalidades
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-xs text-white/25 mt-8">
          Sem cartão de crédito · Configuração em 2 minutos · Cancele quando quiser
        </p>

        {/* Dashboard preview */}
        <div className="mt-16 glass rounded-2xl border border-white/10 p-1 max-w-4xl mx-auto">
          <div className="bg-black/40 rounded-xl h-64 flex items-center justify-center">
            <div className="grid grid-cols-4 gap-3 p-6 w-full">
              {["Novo", "Em Contato", "Proposta", "Fechado"].map((col) => (
                <div key={col} className="space-y-2">
                  <div className="text-xs text-white/30 font-medium mb-3">{col}</div>
                  {[1, 2].map((i) => (
                    <div key={i} className="glass rounded-lg p-3">
                      <div className="h-2 bg-white/10 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-white/6 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
