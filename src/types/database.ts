export type LeadStatus =
  | "novo"
  | "em_contato"
  | "qualificado"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export type AtividadeTipo = "ligacao" | "whatsapp" | "email" | "reuniao" | "outro";
export type TenantRole =
  | "owner"
  | "gerente"
  | "vendedor"
  | "atendente"
  | "consultor"
  | "gerente_suporte"
  | "gerente_cs"
  | "gerente_financeiro"
  | "financeiro"
  | "gerente_marketing"
  | "marketing"
  | "analista_ecommerce"
  | "gerente_geral";
export type ConversaStatus = "ativo" | "resolvido" | "pausado";
export type ConversaCanal = "whatsapp" | "email" | "instagram" | "telegram" | "facebook_messenger" | "webchat" | "interno";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";
export type EmailTheme = "dark" | "light";

export interface Plan {
  id: string;
  name: string;
  price_brl: number;
  max_workspaces: number;
  max_leads: number;
  features: string[];
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  nome_fantasia: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  email_theme: EmailTheme;
  white_label: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  cpf: string | null;
  avatar_url: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramConfig {
  tenant_id: string;
  page_id: string;
  instagram_business_account_id: string;
  access_token: string;
  verify_token: string;
  username: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  faturamento: string | null;
  servico_interesse: string | null;
  status: LeadStatus;
  observacoes: string | null;
  valor_estimado: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

export interface Atividade {
  id: string;
  tenant_id: string;
  lead_id: string;
  tipo: AtividadeTipo;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string;
}

export interface Conversa {
  id: string;
  tenant_id: string;
  lead_id: string;
  canal: ConversaCanal;
  status: ConversaStatus;
  ia_ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadIdentity {
  id: string;
  tenant_id: string;
  lead_id: string;
  canal: Exclude<ConversaCanal, "interno">;
  valor: string | null;
  valor_normalizado: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  tenant_id: string;
  remetente: "lead" | "ia" | "humano";
  conteudo: string;
  wa_message_id: string | null;
  external_message_id: string | null;
  reply_to_mensagem_id: string | null;
  status: "sending" | "sent" | "delivered" | "read" | "failed" | null;
  enviada: boolean;
  created_at: string;
  // Mídia
  media_url: string | null;
  media_type: "image" | "audio" | "video" | "document" | "sticker" | "location" | null;
  media_nome: string | null;
  media_mime: string | null;
  media_caption: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  mp_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

// Supabase Database type (para createClient genérico)
export type Database = {
  public: {
    Tables: {
      plans: { Row: Plan; Insert: Omit<Plan, "id" | "created_at">; Update: Partial<Plan> };
      tenants: { Row: Tenant; Insert: Omit<Tenant, "id" | "created_at" | "updated_at">; Update: Partial<Tenant> };
      tenant_members: { Row: TenantMember; Insert: Omit<TenantMember, "id" | "created_at">; Update: Partial<TenantMember> };
      user_profiles: { Row: UserProfile; Insert: Omit<UserProfile, "created_at" | "updated_at">; Update: Partial<UserProfile> };
      instagram_configs: { Row: InstagramConfig; Insert: Omit<InstagramConfig, "created_at" | "updated_at">; Update: Partial<InstagramConfig> };
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at">; Update: Partial<Lead> };
      lead_identities: { Row: LeadIdentity; Insert: Omit<LeadIdentity, "id" | "created_at" | "updated_at">; Update: Partial<LeadIdentity> };
      atividades: { Row: Atividade; Insert: Omit<Atividade, "id" | "created_at">; Update: Partial<Atividade> };
      conversas: { Row: Conversa; Insert: Omit<Conversa, "id" | "created_at" | "updated_at">; Update: Partial<Conversa> };
      mensagens: { Row: Mensagem; Insert: Omit<Mensagem, "id" | "created_at">; Update: Partial<Mensagem> };
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, "id" | "created_at">; Update: Partial<Subscription> };
    };
  };
};

export type LooseDatabase = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<
      string,
      {
        Row: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Functions: Record<
      string,
      {
        Args: Record<string, unknown>;
        Returns: unknown;
      }
    >;
  };
};
