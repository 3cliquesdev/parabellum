import { Kanban, Users, CheckSquare, MessageSquare, BarChart2, Shield } from "lucide-react";

const features = [
  {
    icon: Kanban,
    title: "Pipeline Visual",
    description: "Arraste e solte leads pelo funil. 7 etapas configuráveis com valor estimado em cada negócio.",
  },
  {
    icon: Users,
    title: "Gestão de Leads",
    description: "Cadastro completo com histórico, notas, UTM tracking e exportação para CSV.",
  },
  {
    icon: CheckSquare,
    title: "Atividades & Tarefas",
    description: "Ligações, WhatsApp, e-mails e reuniões. Acompanhe prazos e nunca perca um follow-up.",
  },
  {
    icon: MessageSquare,
    title: "Inbox com IA",
    description: "Chat com respostas automáticas geradas por IA. Ative ou desative a IA por conversa.",
  },
  {
    icon: BarChart2,
    title: "Analytics",
    description: "Métricas de pipeline, taxa de conversão, ticket médio e evolução mensal.",
  },
  {
    icon: Shield,
    title: "Multi-tenant Seguro",
    description: "Cada workspace é completamente isolado. Row Level Security no Supabase.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo que você precisa para vender
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Uma plataforma completa para gerenciar leads, pipeline e relacionamento com clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="glass glass-hover rounded-2xl p-6 group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
