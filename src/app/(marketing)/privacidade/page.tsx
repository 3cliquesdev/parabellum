import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Liberty CRM",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
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

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-12">
          <p className="section-label mb-4">Legal</p>
          <h1 className="text-4xl font-extrabold text-white tracking-[-0.03em] mb-4">
            Política de <span className="font-serif italic font-normal" style={{ color: "#9aea62" }}>Privacidade</span>
          </h1>
          <p className="text-sm" style={{ color: "#939da4" }}>Última atualização: maio de 2026</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "#939da4" }}>

          {[
            {
              title: "1. Informações que coletamos",
              content: "Coletamos informações que você fornece diretamente ao criar uma conta, como nome, e-mail e nome da empresa. Também coletamos dados de uso da plataforma para melhorar nossos serviços, como páginas visitadas, funcionalidades utilizadas e dados de performance."
            },
            {
              title: "2. Como usamos suas informações",
              content: "Usamos suas informações para fornecer, manter e melhorar o Liberty CRM; processar transações e enviar notificações relacionadas ao serviço; responder a comentários e perguntas; e enviar comunicações de marketing com seu consentimento."
            },
            {
              title: "3. Compartilhamento de informações",
              content: "Não vendemos, trocamos ou transferimos suas informações pessoais a terceiros, exceto quando necessário para operar nossa plataforma (como provedores de hospedagem e pagamento), cumprir obrigações legais ou proteger nossos direitos."
            },
            {
              title: "4. Integração com WhatsApp Business",
              content: "Ao conectar sua conta do WhatsApp Business ao Liberty CRM, coletamos e armazenamos o Phone Number ID e Access Token fornecidos pela Meta. Essas informações são usadas exclusivamente para enviar e receber mensagens em seu nome. Não compartilhamos suas credenciais com terceiros."
            },
            {
              title: "5. Segurança dos dados",
              content: "Implementamos medidas de segurança técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia, controle de acesso e isolamento de dados por workspace (multi-tenant)."
            },
            {
              title: "6. Retenção de dados",
              content: "Mantemos suas informações enquanto sua conta estiver ativa. Você pode solicitar a exclusão dos seus dados a qualquer momento. Após o encerramento da conta, seus dados serão excluídos em até 30 dias, exceto quando a retenção for exigida por lei."
            },
            {
              title: "7. Seus direitos (LGPD)",
              content: "De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito de: acessar seus dados pessoais; corrigir dados incompletos ou incorretos; solicitar a exclusão dos seus dados; revogar o consentimento para uso dos seus dados; e solicitar a portabilidade dos seus dados."
            },
            {
              title: "8. Cookies",
              content: "Utilizamos cookies para manter sua sessão ativa e melhorar a experiência de uso. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades da plataforma."
            },
            {
              title: "9. Contato",
              content: "Para questões relacionadas à privacidade, entre em contato pelo e-mail: contato@adsliberty.com"
            },
          ].map(({ title, content }) => (
            <div key={title} className="rounded-2xl p-6"
              style={{ background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-base font-bold text-white mb-3">{title}</h2>
              <p>{content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>© 2026 Liberty CRM · <Link href="/termos" style={{ color: "#939da4" }}>Termos de Serviço</Link></p>
      </footer>
    </div>
  );
}
