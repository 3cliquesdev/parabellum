-- Planos que a AGÊNCIA define para oferecer aos seus clientes finais
CREATE TABLE IF NOT EXISTS agency_client_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  price_brl     numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text DEFAULT 'mensal' CHECK (billing_cycle IN ('mensal','trimestral','semestral','anual')),
  features      text[] DEFAULT '{}',  -- lista de features incluídas
  ativo         boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_client_plans_agency ON agency_client_plans(agency_id);
ALTER TABLE agency_client_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_client_plans_isolation" ON agency_client_plans
  FOR ALL TO authenticated
  USING ((SELECT is_super_admin()) OR agency_id IN (SELECT get_user_agency_ids()));
GRANT ALL ON agency_client_plans TO authenticated;
