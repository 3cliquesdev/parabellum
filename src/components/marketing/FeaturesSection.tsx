const features = [
  {
    title: "Pipeline visual",
    description: "Kanban com 7 etapas configuráveis. Arraste leads pelo funil e acompanhe o valor de cada negócio em tempo real.",
  },
  {
    title: "Gestão de leads",
    description: "Cadastro completo com histórico, notas, rastreamento de UTM e exportação para CSV com um clique.",
  },
  {
    title: "Atividades e tarefas",
    description: "Ligações, WhatsApp, e-mails e reuniões. Prazos com alertas para que nenhum follow-up seja esquecido.",
  },
  {
    title: "Inbox com IA",
    description: "Respostas automáticas geradas por inteligência artificial. Ative ou desative a IA por conversa.",
  },
  {
    title: "Analytics",
    description: "Taxa de conversão, ticket médio, evolução mensal e valor total do pipeline em um painel unificado.",
  },
  {
    title: "Multi-tenant seguro",
    description: "Cada workspace é completamente isolado com Row Level Security no Supabase. Dados nunca se misturam.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-6" style={{ background: "#000000" }}>
      <div className="max-w-[1000px] mx-auto">

        <div className="mb-20">
          <p className="section-label mb-4">Funcionalidades</p>
          <h2 className="text-[42px] md:text-[52px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] max-w-[600px]"
            style={{ fontFamily: "var(--font-sans)" }}>
            Tudo que você precisa para{" "}
            <span className="font-serif italic font-normal" style={{ color: "#f9f6ec" }}>
              vender melhor
            </span>
          </h2>
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{ background: "rgba(255,255,255,0.06)", borderRadius: "28px", overflow: "hidden" }}>
          {features.map(({ title, description }) => (
            <div key={title} className="feature-card p-8">
              <div className="w-8 h-8 rounded-lg mb-5 flex items-center justify-center"
                style={{ background: "rgba(154,234,98,0.1)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#9aea62" }} />
              </div>
              <h3 className="text-base font-bold text-white mb-2 tracking-[-0.01em]">{title}</h3>
              <p className="text-sm leading-[1.65]" style={{ color: "#939da4" }}>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
