-- Mapeamento idempotente da migração de tickets do CRM legado.
-- Nenhum ticket histórico é duplicado quando a sincronização é executada novamente.

CREATE TABLE IF NOT EXISTS legacy_ticket_mappings (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_ticket_id text NOT NULL,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  source_updated_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, source_ticket_id),
  UNIQUE (ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_legacy_ticket_mappings_ticket
  ON legacy_ticket_mappings(ticket_id);

CREATE TABLE IF NOT EXISTS legacy_ticket_comment_mappings (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_ticket_id text NOT NULL,
  source_comment_key text NOT NULL,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES ticket_comments(id) ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, source_ticket_id, source_comment_key),
  UNIQUE (comment_id)
);

CREATE TABLE IF NOT EXISTS legacy_ticket_sync_state (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  cursor text,
  last_source_updated_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE legacy_ticket_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_ticket_comment_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_ticket_sync_state ENABLE ROW LEVEL SECURITY;

GRANT ALL ON legacy_ticket_mappings TO service_role;
GRANT ALL ON legacy_ticket_comment_mappings TO service_role;
GRANT ALL ON legacy_ticket_sync_state TO service_role;
