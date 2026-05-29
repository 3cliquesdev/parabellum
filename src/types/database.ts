export type LeadStatus =
  | "novo"
  | "em_contato"
  | "qualificado"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export type AtividadeTipo = "ligacao" | "whatsapp" | "email" | "reuniao" | "outro";
export type TenantRole = "owner" | "admin" | "member";
export type ConversaStatus = "ativo" | "resolvido" | "pausado";
export type ConversaCanal = "whatsapp" | "email" | "interno";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

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

export interface Mensagem {
  id: string;
  conversa_id: string;
  tenant_id: string;
  remetente: "lead" | "ia" | "humano";
  conteudo: string;
  wa_message_id: string | null;
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
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at">; Update: Partial<Lead> };
      atividades: { Row: Atividade; Insert: Omit<Atividade, "id" | "created_at">; Update: Partial<Atividade> };
      conversas: { Row: Conversa; Insert: Omit<Conversa, "id" | "created_at" | "updated_at">; Update: Partial<Conversa> };
      mensagens: { Row: Mensagem; Insert: Omit<Mensagem, "id" | "created_at">; Update: Partial<Mensagem> };
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, "id" | "created_at">; Update: Partial<Subscription> };
    };
  };
};
