import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Liberty CRM",
  description: "Política de Privacidade do Liberty CRM — como coletamos, usamos e protegemos seus dados.",
};

const sections = [
  {
    title: "1. Identificação do Responsável",
    content:
      "O Liberty CRM é desenvolvido e operado pela Liberty Company Ads, empresa com sede no Brasil. Esta Política de Privacidade se aplica ao aplicativo Liberty CRM registrado na plataforma Meta Platforms, Inc., e descreve como coletamos, usamos, armazenamos e protegemos os dados dos nossos usuários. Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato com nosso responsável de dados pelo e-mail: privacidade@adsliberty.com",
  },
  {
    title: "2. Informações que Coletamos",
    content:
      "Coletamos informações que você fornece diretamente ao criar uma conta, como nome, endereço de e-mail e nome da empresa. Também coletamos dados de uso da plataforma para melhorar nossos serviços, como páginas visitadas, funcionalidades utilizadas e dados de performance do sistema. Ao conectar integrações externas (como WhatsApp Business ou Meta), coletamos somente os dados necessários para operar essas integrações, conforme detalhado nas seções abaixo.",
  },
  {
    title: "3. Permissão: whatsapp_business_management",
    content:
      "O Liberty CRM solicita a permissão whatsapp_business_management para permitir que os usuários gerenciem, diretamente pelo painel do CRM, os ativos da sua conta WhatsApp Business. Essa permissão é utilizada para: (1) listar e visualizar os números de telefone registrados na conta WhatsApp Business do usuário; (2) criar, listar e gerenciar modelos de mensagem (message templates) aprovados pela Meta; (3) consultar informações da WhatsApp Business Account (WABA) para exibição no painel. Nenhum dado obtido via esta permissão é compartilhado com terceiros. Todos os dados ficam restritos ao workspace isolado do usuário autenticado.",
  },
  {
    title: "4. Permissão: whatsapp_business_messaging",
    content:
      "A permissão whatsapp_business_messaging é utilizada exclusivamente para enviar e receber mensagens de WhatsApp em nome do usuário, através da API oficial da Meta Cloud API. O Liberty CRM usa essa permissão para: (1) enviar mensagens de atendimento iniciadas pelo usuário ou por automações configuradas pelo próprio usuário no CRM; (2) receber mensagens dos contatos via webhook seguro e exibi-las no painel de conversas; (3) enviar mensagens usando templates aprovados pela Meta para notificações de pedidos e follow-ups. O Liberty CRM nunca envia mensagens sem a configuração explícita e prévia do usuário.",
  },
  {
    title: "5. Permissão: business_management",
    content:
      "A permissão business_management é utilizada para que o Liberty CRM possa acessar informações do Gerenciador de Negócios da Meta associado à conta do usuário. Essa permissão é necessária para: (1) verificar se o usuário tem acesso à WhatsApp Business Account configurada; (2) validar a autenticação OAuth do usuário com os recursos Meta; (3) permitir que usuários com múltiplas contas de negócio selecionem qual conta desejam conectar ao CRM. Nenhum dado de campanhas de terceiros é coletado sem consentimento explícito.",
  },
  {
    title: "6. Como Usamos Suas Informações",
    content:
      "Usamos suas informações exclusivamente para: fornecer, manter e melhorar o Liberty CRM; processar transações e enviar notificações operacionais; responder a dúvidas e solicitações de suporte; e enviar comunicações de marketing apenas com seu consentimento expresso. Não utilizamos dados obtidos via permissões da Meta para fins de publicidade própria nem para criação de perfis de usuário para terceiros.",
  },
  {
    title: "7. Compartilhamento de Informações",
    content:
      "Não vendemos, trocamos ou transferimos suas informações pessoais a terceiros. Compartilhamos dados apenas com subprocessadores necessários para operar a plataforma, que incluem: Supabase Inc. (banco de dados e autenticação — servidores na região São Paulo), Vercel Inc. (hospedagem e CDN) e Meta Platforms Inc. (API de WhatsApp). Todos estão sujeitos a acordos de proteção de dados adequados e em conformidade com a LGPD.",
  },
  {
    title: "8. Segurança dos Dados",
    content:
      "Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações. Utilizamos: criptografia AES-256 em repouso para todos os tokens e credenciais; TLS 1.3 para dados em trânsito; Row-Level Security (RLS) no banco de dados para isolamento total entre tenants; controle de acesso por função (RBAC) dentro de cada workspace; e autenticação multifator (MFA) disponível para todos os usuários.",
  },
  {
    title: "9. Retenção e Exclusão de Dados",
    content:
      "Mantemos seus dados enquanto sua conta estiver ativa. Para solicitar a exclusão dos seus dados, envie um e-mail para privacidade@adsliberty.com. Após a solicitação, seus dados serão permanentemente removidos em até 30 dias, exceto quando a retenção for exigida por lei. Para revogar o acesso do Liberty CRM à sua conta Meta, acesse as configurações do seu Facebook Business Manager e remova o aplicativo Liberty CRM na seção de Aplicativos conectados.",
  },
  {
    title: "10. Seus Direitos (LGPD)",
    content:
      "De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito de: (1) acessar seus dados pessoais; (2) corrigir dados incompletos ou incorretos; (3) solicitar a exclusão dos seus dados; (4) revogar o consentimento para uso dos seus dados; (5) solicitar a portabilidade dos seus dados; (6) ser informado sobre o compartilhamento de dados. Para exercer qualquer desses direitos, entre em contato pelo e-mail: privacidade@adsliberty.com",
  },
  {
    title: "11. Cookies",
    content:
      "Utilizamos cookies essenciais para manter sua sessão ativa e garantir o funcionamento seguro da plataforma. Não utilizamos cookies de rastreamento de terceiros ou pixels de publicidade. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento do login e das funcionalidades do CRM.",
  },
  {
    title: "12. Contato e Encarregado de Dados (DPO)",
    content:
      "Responsável pelo tratamento: Liberty Company Ads. E-mail de privacidade (DPO): privacidade@adsliberty.com. E-mail geral: contato@adsliberty.com. Esta política pode ser atualizada periodicamente. Notificaremos os usuários sobre mudanças significativas por e-mail ou através da plataforma com antecedência mínima de 15 dias.",
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 h-16 fixed top-0 inset-x-0 z-50"
        style={{
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "#9aea62" }}
          >
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
            Política de{" "}
            <span
              className="font-serif italic font-normal"
              style={{ color: "#9aea62" }}
            >
              Privacidade
            </span>
          </h1>
          <p className="text-sm" style={{ color: "#939da4" }}>
            Última atualização: junho de 2026
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#939da4" }}>
          {sections.map(({ title, content }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{
                background:
                  "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <h2 className="text-base font-bold text-white mb-3">{title}</h2>
              <p>{content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="py-8 px-6 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs" style={{ color: "rgba(147,157,164,0.4)" }}>
          © 2026 Liberty CRM ·{" "}
          <Link href="/termos" style={{ color: "#939da4" }}>
            Termos de Serviço
          </Link>
        </p>
      </footer>
    </div>
  );
}
