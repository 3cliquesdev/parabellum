import Link from "next/link";

export const metadata = {
  title: "Termos de Serviço — Liberty CRM",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>

      <header className="flex items-center justify-between px-8 h-16 fixed top-0 inset-x-0 z-50"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#9aea62" }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 10.5H1.5L6 1Z" fill="#0a0a0a" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white">Liberty CRM</span>
        </Link>
        <Link href="/" className="text-sm transition-colors" style={{ color: "#939da4" }}>
          Voltar ao início
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-12">
          <p className="section-label mb-4">Legal</p>
          <h1 className="text-4xl font-extrabold text-white tracking-[-0.03em] mb-4">
            Termos de <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Serviço</span>
          </h1>
          <p className="text-sm" style={{ color: "#939da4" }}>Última atualização: maio de 2026</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "#939da4" }}>
          {[
            { title: "1. Aceitação dos termos", content: "Ao acessar e usar o Liberty CRM, você concorda com estes Termos de Serviço. Se não concordar com qualquer parte, não utilize nossos serviços." },
            { title: "2. Descrição do serviço", content: "O Liberty CRM é uma plataforma SaaS de gestão de relacionamento com clientes (CRM) que oferece pipeline de vendas, gestão de leads, atividades, inbox com WhatsApp e inteligência artificial." },
            { title: "3. Conta e segurança", content: "Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado." },
            { title: "4. Planos e pagamentos", content: "Os planos pagos são cobrados mensalmente ou anualmente conforme escolhido. O período de trial de 30 dias não requer cartão de crédito. Cancelamentos podem ser feitos a qualquer momento, sem multas." },
            { title: "5. Integração com WhatsApp Business API", content: "O uso da integração WhatsApp requer conformidade com os Termos de Serviço da Meta e da WhatsApp Business API. Você é responsável pelo conteúdo das mensagens enviadas e pelo cumprimento das políticas da Meta." },
            { title: "6. Propriedade intelectual", content: "O Liberty CRM e todo seu conteúdo são propriedade da 3Cliques. Você retém a propriedade de todos os dados inseridos na plataforma." },
            { title: "7. Limitação de responsabilidade", content: "O Liberty CRM não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso do serviço." },
            { title: "8. Rescisão", content: "Podemos encerrar ou suspender seu acesso imediatamente em caso de violação destes Termos. Você pode encerrar sua conta a qualquer momento através das configurações." },
            { title: "9. Contato", content: "Para questões sobre estes Termos, entre em contato: contato@adsliberty.com" },
          ].map(({ title, content }) => (
            <div key={title} className="rounded-2xl p-6"
              style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-base font-bold text-white mb-3">{title}</h2>
              <p>{content}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>© 2026 Liberty CRM · <Link href="/privacidade" style={{ color: "#939da4" }}>Política de Privacidade</Link></p>
      </footer>
    </div>
  );
}
