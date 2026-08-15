-- Portado da logica validada do Parabellum (Lovable): numero de protocolo
-- por sequence anual, SLA por due_date, e tags configuraveis.

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN (
    'aberto', 'em_andamento', 'retorno', 'aguardando_cliente',
    'aguardando_aprovacao', 'aprovado', 'resolvido', 'fechado'
  ));

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

ALTER TABLE ticket_categories
  ADD COLUMN IF NOT EXISTS descricao text;

-- Protocolo TK-{ano}-{sequencial 5 digitos}, sequence criada sob demanda por ano.
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year text;
  seq_name text;
  next_val integer;
BEGIN
  current_year := to_char(current_date, 'YYYY');
  seq_name := 'ticket_number_seq_' || current_year;

  BEGIN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1', seq_name);
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;

  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;

  NEW.ticket_number := 'TK-' || current_year || '-' || LPAD(next_val::text, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON tickets;
CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- Tags (rotulos livres, configuraveis por tenant, reutilizaveis entre tickets)
CREATE TABLE IF NOT EXISTS tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  cor        text NOT NULL DEFAULT '#939da4',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_tenant" ON tags;
CREATE POLICY "tags_tenant" ON tags
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
GRANT ALL ON tags TO authenticated;
GRANT ALL ON tags TO service_role;

CREATE TABLE IF NOT EXISTS ticket_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, tag_id)
);

ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_tags_tenant" ON ticket_tags;
CREATE POLICY "ticket_tags_tenant" ON ticket_tags
  FOR ALL TO authenticated
  USING (ticket_id IN (SELECT id FROM tickets WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())))
  WITH CHECK (ticket_id IN (SELECT id FROM tickets WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));
GRANT ALL ON ticket_tags TO authenticated;
GRANT ALL ON ticket_tags TO service_role;
