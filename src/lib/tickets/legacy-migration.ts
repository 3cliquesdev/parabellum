import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";

type Admin = SupabaseClient<LooseDatabase>;

type LegacyComment = Record<string, unknown>;
type LegacyTicket = Record<string, unknown>;
type MemberDirectory = {
  exact: Map<string, string>;
  uniqueFirstName: Map<string, string>;
};

type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  commentsCreated: number;
  hasMore: boolean;
  nextCursor: string | null;
};

const TICKET_STATUSES = new Set([
  "aberto", "em_andamento", "retorno", "aguardando_cliente",
  "aguardando_aprovacao", "aprovado", "resolvido", "fechado",
]);
const PRIORITIES = new Set(["baixa", "media", "alta", "urgente"]);
const CHANNELS = new Set(["whatsapp", "email", "instagram", "telegram", "facebook_messenger", "manual", "ia"]);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectName(value: unknown): string | null {
  if (typeof value === "string") return text(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return text(row.nome) ?? text(row.name) ?? text(row.title) ?? text(row.label);
}

function timestamp(value: unknown): string | null {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? new Date(candidate).toISOString() : null;
}

function normalized(value: string | null | undefined): string | null {
  return value?.trim().toLocaleLowerCase("pt-BR") ?? null;
}

function normalizedPerson(value: string | null | undefined): string | null {
  return normalized(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    ?? null;
}

function legacyPerson(value: unknown): string | null {
  if (typeof value === "string") return text(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return text(row.email) ?? text(row.nome) ?? text(row.name) ?? text(row.full_name) ?? text(row.username);
}

function sourcePerson(ticket: LegacyTicket, fields: string[]): string | null {
  for (const field of fields) {
    const candidate = legacyPerson(ticket[field]);
    if (candidate) return candidate;
  }
  return null;
}

async function getMemberDirectory(admin: Admin, tenantId: string): Promise<MemberDirectory> {
  const exact = new Map<string, string>();
  const firstNames = new Map<string, string[]>();
  const { data: members, error } = await admin.from("tenant_members").select("user_id").eq("tenant_id", tenantId);
  if (error) throw error;

  await Promise.all((members ?? []).map(async (member) => {
    const userId = (member as { user_id: string }).user_id;
    const { data } = await admin.auth.admin.getUserById(userId);
    const user = data.user;
    if (!user) return;
    const values = [
      user.email,
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
    ];
    for (const value of values) {
      const key = normalizedPerson(value);
      if (key) exact.set(key, userId);
    }
    const displayName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
    const firstName = normalizedPerson(displayName)?.split(" ")[0];
    if (firstName) {
      const ids = firstNames.get(firstName) ?? [];
      ids.push(userId);
      firstNames.set(firstName, ids);
    }
  }));
  const uniqueFirstName = new Map<string, string>();
  for (const [firstName, ids] of firstNames) {
    if (ids.length === 1) uniqueFirstName.set(firstName, ids[0]);
  }
  return { exact, uniqueFirstName };
}

function resolveMemberId(directory: MemberDirectory, value: string | null): string | null {
  const key = normalizedPerson(value);
  if (!key) return null;
  return directory.exact.get(key) ?? directory.uniqueFirstName.get(key.split(" ")[0]) ?? null;
}

function mapStatus(value: unknown): string {
  const raw = normalized(text(value))?.replace(/[ -]/g, "_") ?? "aberto";
  const aliases: Record<string, string> = {
    em_andamento: "em_andamento", andamento: "em_andamento", em_atendimento: "em_andamento",
    aguardando_aprovacao: "aguardando_aprovacao", aguardando_cliente: "aguardando_cliente",
    aguardando_resposta: "aguardando_cliente", encerrado: "fechado", cancelado: "fechado",
    concluido: "resolvido", concluído: "resolvido", resolvido: "resolvido",
    open: "aberto", in_progress: "em_andamento", pending_customer: "aguardando_cliente",
    approved: "aprovado", resolved: "resolvido", closed: "fechado",
  };
  const mapped = aliases[raw] ?? raw;
  return TICKET_STATUSES.has(mapped) ? mapped : "aberto";
}

function mapPriority(value: unknown): string {
  const raw = normalized(text(value))?.replace(/[ -]/g, "_") ?? "media";
  const aliases: Record<string, string> = { low: "baixa", medium: "media", high: "alta", urgent: "urgente" };
  const mapped = aliases[raw] ?? raw;
  return PRIORITIES.has(mapped) ? mapped : "media";
}

function mapChannel(value: unknown): string {
  const raw = normalized(text(value))?.replace(/[ -]/g, "_") ?? "manual";
  const aliases: Record<string, string> = { messenger: "facebook_messenger", web: "manual", formulario: "manual", form: "manual" };
  const mapped = aliases[raw] ?? raw;
  return CHANNELS.has(mapped) ? mapped : "manual";
}

function legacyCommentKey(comment: LegacyComment, index: number): string {
  const id = text(comment.id) ?? text(comment.comment_id);
  if (id) return id;
  return createHash("sha256").update(JSON.stringify({
    index,
    created_at: comment.created_at ?? comment.date ?? null,
    content: comment.conteudo ?? comment.content ?? comment.message ?? comment.text ?? null,
  })).digest("hex");
}

function commentContent(comment: LegacyComment): string | null {
  return text(comment.conteudo) ?? text(comment.content) ?? text(comment.message) ?? text(comment.text) ?? text(comment.body);
}

function commentAuthorType(comment: LegacyComment): "agente" | "ia" | "sistema" | "cliente" {
  const raw = normalized(text(comment.autor_tipo) ?? text(comment.author_type) ?? text(comment.sender_type));
  if (raw?.includes("cliente") || raw?.includes("customer")) return "cliente";
  if (raw?.includes("ia") || raw?.includes("ai")) return "ia";
  if (raw?.includes("sistema") || raw?.includes("system")) return "sistema";
  return "agente";
}

async function getLeadId(admin: Admin, tenantId: string, contact: unknown): Promise<string | null> {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) return null;
  const row = contact as Record<string, unknown>;
  const email = normalized(text(row.email));
  const phone = text(row.phone) ?? text(row.whatsapp);
  if (email) {
    const { data } = await admin.from("leads").select("id").eq("tenant_id", tenantId).ilike("email", email).maybeSingle();
    if (data) return (data as { id: string }).id;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const { data } = await admin.from("leads").select("id").eq("tenant_id", tenantId).or(`whatsapp.eq.${digits},whatsapp.eq.+${digits}`).maybeSingle();
    if (data) return (data as { id: string }).id;
  }
  return null;
}

async function findByName(admin: Admin, table: "ticket_categories" | "departments" | "operacoes", tenantId: string, name: string | null): Promise<string | null> {
  if (!name) return null;
  const column = table === "departments" ? "name" : "nome";
  const { data } = await admin.from(table).select("id").eq("tenant_id", tenantId).ilike(column, name).maybeSingle();
  return data ? (data as { id: string }).id : null;
}

async function resolveCategory(admin: Admin, tenantId: string, value: unknown): Promise<string | null> {
  const name = objectName(value);
  if (!name) return null;
  const found = await findByName(admin, "ticket_categories", tenantId, name);
  if (found) return found;
  const color = typeof value === "object" && value ? text((value as Record<string, unknown>).cor) ?? "#60a5fa" : "#60a5fa";
  const { data, error } = await admin.from("ticket_categories").insert({ tenant_id: tenantId, nome: name, cor: color }).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function syncTags(admin: Admin, tenantId: string, ticketId: string, values: unknown): Promise<void> {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    const name = objectName(value);
    if (!name) continue;
    const color = typeof value === "object" && value ? text((value as Record<string, unknown>).cor) ?? "#939da4" : "#939da4";
    let { data: tag } = await admin.from("tags").select("id").eq("tenant_id", tenantId).ilike("nome", name).maybeSingle();
    if (!tag) {
      const inserted = await admin.from("tags").insert({ tenant_id: tenantId, nome: name, cor: color }).select("id").single();
      if (inserted.error) throw inserted.error;
      tag = inserted.data;
    }
    if (tag) await admin.from("ticket_tags").upsert({ ticket_id: ticketId, tag_id: (tag as { id: string }).id }, { onConflict: "ticket_id,tag_id" });
  }
}

function historicalNote(ticket: LegacyTicket): string {
  const protocol = text(ticket.ticket_number) ?? text(ticket.protocol) ?? text(ticket.numero);
  const sourceDepartment = objectName(ticket.department);
  const sourceOperation = objectName(ticket.operation);
  const requester = objectName(ticket.contact);
  const internalNote = text(ticket.internal_note);
  const details = [
    protocol ? `Protocolo antigo: ${protocol}` : null,
    requester ? `Solicitante antigo: ${requester}` : null,
    sourceDepartment ? `Departamento antigo: ${sourceDepartment}` : null,
    sourceOperation ? `Operação antiga: ${sourceOperation}` : null,
    internalNote ? `Nota interna antiga:\n${internalNote}` : null,
  ].filter(Boolean);
  return `Migração do CRM antigo${details.length ? `\n${details.join("\n")}` : ""}`;
}

async function importOne(admin: Admin, tenantId: string, source: LegacyTicket, result: SyncResult, members: MemberDirectory): Promise<void> {
  const sourceTicketId = text(source.id);
  const title = text(source.subject) ?? text(source.titulo) ?? "Ticket migrado";
  if (!sourceTicketId) throw new Error("Ticket legado sem id");
  const sourceUpdatedAt = timestamp(source.updated_at);
  const { data: mapping } = await admin.from("legacy_ticket_mappings")
    .select("ticket_id, source_updated_at").eq("tenant_id", tenantId).eq("source_ticket_id", sourceTicketId).maybeSingle();

  const categoryId = await resolveCategory(admin, tenantId, source.category);
  const leadId = await getLeadId(admin, tenantId, source.contact);
  const departmentId = await findByName(admin, "departments", tenantId, objectName(source.department));
  const operationId = await findByName(admin, "operacoes", tenantId, objectName(source.operation));
  const assignedTo = resolveMemberId(members, sourcePerson(source, [
    "assigned_to", "assignee", "responsavel", "responsible", "owner", "assigned_user", "responsavel_email", "responsavel_nome",
  ]));
  const createdBy = resolveMemberId(members, sourcePerson(source, [
    "created_by", "creator", "criado_por", "created_user", "autor", "author",
  ]));
  const status = mapStatus(source.status);
  const priority = mapPriority(source.priority);
  const payload = {
    titulo: title,
    descricao: text(source.description),
    categoria_id: categoryId,
    lead_id: leadId,
    status,
    prioridade: priority,
    canal_origem: mapChannel(source.channel),
    department_id: departmentId,
    operacao_id: operationId,
    due_date: timestamp(source.due_date),
    first_response_at: timestamp(source.first_response_at),
    resolved_at: timestamp(source.resolved_at),
    created_at: timestamp(source.created_at) ?? new Date().toISOString(),
    updated_at: sourceUpdatedAt ?? new Date().toISOString(),
  };
  const insertPayload = { ...payload, assigned_to: assignedTo, created_by: createdBy };

  let ticketId: string;
  if (mapping) {
    ticketId = (mapping as { ticket_id: string }).ticket_id;
    const knownUpdated = timestamp((mapping as { source_updated_at?: string | null }).source_updated_at);
    if (!knownUpdated || !sourceUpdatedAt || sourceUpdatedAt > knownUpdated) {
      const { error } = await admin.from("tickets").update(payload).eq("id", ticketId).eq("tenant_id", tenantId);
      if (error) throw error;
      result.updated += 1;
    }
    // Backfill idempotente: traz o responsável/criador antigo somente quando
    // estes campos ainda estão vazios no CRM novo. Nunca sobrescreve alguém
    // que já foi atribuído manualmente aqui.
    if (assignedTo || createdBy) {
      const { data: current } = await admin.from("tickets").select("assigned_to, created_by")
        .eq("id", ticketId).eq("tenant_id", tenantId).maybeSingle();
      const currentTicket = current as { assigned_to?: string | null; created_by?: string | null } | null;
      const identityBackfill: Record<string, string> = {};
      if (assignedTo && !currentTicket?.assigned_to) identityBackfill.assigned_to = assignedTo;
      if (createdBy && !currentTicket?.created_by) identityBackfill.created_by = createdBy;
      if (Object.keys(identityBackfill).length) {
        const { error } = await admin.from("tickets").update(identityBackfill).eq("id", ticketId).eq("tenant_id", tenantId);
        if (error) throw error;
        result.updated += 1;
      }
    }
    await admin.from("legacy_ticket_mappings").update({ source_updated_at: sourceUpdatedAt, imported_at: new Date().toISOString() })
      .eq("tenant_id", tenantId).eq("source_ticket_id", sourceTicketId);
  } else {
    const { data, error } = await admin.from("tickets").insert({ tenant_id: tenantId, ...insertPayload }).select("id").single();
    if (error) throw error;
    ticketId = (data as { id: string }).id;
    const { error: mapError } = await admin.from("legacy_ticket_mappings").insert({ tenant_id: tenantId, source_ticket_id: sourceTicketId, ticket_id: ticketId, source_updated_at: sourceUpdatedAt });
    if (mapError) throw mapError;
    const { error: noteError } = await admin.from("ticket_comments").insert({
      ticket_id: ticketId, tenant_id: tenantId, autor_tipo: "sistema", interno: true, conteudo: historicalNote(source),
      created_at: payload.created_at,
    });
    if (noteError) throw noteError;
    result.created += 1;
  }

  await syncTags(admin, tenantId, ticketId, source.tags);
  const comments = Array.isArray(source.comments) ? source.comments : [];
  for (let index = 0; index < comments.length; index += 1) {
    const comment = comments[index] as LegacyComment;
    const key = legacyCommentKey(comment, index);
    const content = commentContent(comment);
    if (!content) continue;
    const { data: existing } = await admin.from("legacy_ticket_comment_mappings").select("comment_id")
      .eq("tenant_id", tenantId).eq("source_ticket_id", sourceTicketId).eq("source_comment_key", key).maybeSingle();
    if (existing) continue;
    const { data: inserted, error } = await admin.from("ticket_comments").insert({
      ticket_id: ticketId, tenant_id: tenantId, conteudo: content, interno: Boolean(comment.internal ?? comment.interno),
      autor_tipo: commentAuthorType(comment), created_at: timestamp(comment.created_at) ?? payload.created_at,
    }).select("id").single();
    if (error) throw error;
    const { error: commentMapError } = await admin.from("legacy_ticket_comment_mappings").insert({
      tenant_id: tenantId, source_ticket_id: sourceTicketId, source_comment_key: key, ticket_id: ticketId, comment_id: (inserted as { id: string }).id,
    });
    if (commentMapError) throw commentMapError;
    result.commentsCreated += 1;
  }
}

export async function syncLegacyTickets(admin: Admin, tenantId: string): Promise<SyncResult> {
  const endpoint = process.env.LEGACY_TICKETS_MIGRATION_URL?.trim();
  const key = process.env.LEGACY_TICKETS_MIGRATION_KEY?.trim();
  if (!endpoint || !key) throw new Error("Migracao de tickets antigos nao configurada");

  const { data: state } = await admin.from("legacy_ticket_sync_state").select("cursor, last_source_updated_at")
    .eq("tenant_id", tenantId).maybeSingle();
  const syncState = state as { cursor?: string | null; last_source_updated_at?: string | null } | null;
  const url = new URL(endpoint);
  // Lotes menores evitam timeout em ambientes serverless; o cursor torna a
  // execução reentrante e idempotente até todo o histórico ser copiado.
  url.searchParams.set("limit", "50");
  if (syncState?.cursor) url.searchParams.set("cursor", syncState.cursor);
  else if (syncState?.last_source_updated_at) {
    const overlap = new Date(new Date(syncState.last_source_updated_at).getTime() - 5 * 60 * 1000).toISOString();
    url.searchParams.set("since", overlap);
  }

  const response = await fetch(url, { headers: { "x-api-key": key }, cache: "no-store" });
  if (!response.ok) throw new Error(`CRM antigo respondeu ${response.status}`);
  const body = await response.json() as { data?: LegacyTicket[]; has_more?: boolean; next_cursor?: string | null };
  const rows = Array.isArray(body.data) ? body.data : [];
  const result: SyncResult = { fetched: rows.length, created: 0, updated: 0, commentsCreated: 0, hasMore: Boolean(body.has_more), nextCursor: body.next_cursor ?? null };
  let newest: string | null = syncState?.last_source_updated_at ?? null;
  const members = await getMemberDirectory(admin, tenantId);
  for (const ticket of rows) {
    await importOne(admin, tenantId, ticket, result, members);
    const changed = timestamp(ticket.updated_at);
    if (changed && (!newest || changed > newest)) newest = changed;
  }
  const { error: stateError } = await admin.from("legacy_ticket_sync_state").upsert({
    tenant_id: tenantId,
    cursor: result.hasMore ? result.nextCursor : null,
    last_source_updated_at: result.hasMore ? syncState?.last_source_updated_at ?? null : newest,
    last_synced_at: result.hasMore ? null : new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id" });
  if (stateError) throw stateError;
  return result;
}

export async function recordLegacyTicketSyncError(admin: Admin, tenantId: string, error: unknown): Promise<void> {
  await admin.from("legacy_ticket_sync_state").upsert({
    tenant_id: tenantId, last_error: error instanceof Error ? error.message.slice(0, 1000) : "Erro desconhecido", updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id" });
}
