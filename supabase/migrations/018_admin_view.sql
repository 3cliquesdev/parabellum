-- View para o painel super admin
-- Junta tenants + agencies + plans + subscriptions + billing
CREATE OR REPLACE VIEW admin_tenant_overview AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.created_at,
  t.agency_id,
  a.name          AS agency_name,
  a.display_name  AS agency_display_name,
  p.name          AS plan_name,
  COALESCE(p.price_brl, 0) AS price_brl,
  COALESCE(s.status, 'no_subscription') AS subscription_status,
  s.current_period_end,
  (SELECT COUNT(*) FROM tenant_members tm WHERE tm.tenant_id = t.id)::int AS member_count,
  (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id)::int             AS lead_count,
  COALESCE(tb.price_brl, 0)        AS client_price_brl,
  tb.payment_status                AS client_payment_status,
  tb.billing_cycle
FROM tenants t
LEFT JOIN agencies    a  ON a.id  = t.agency_id
LEFT JOIN plans       p  ON p.id  = t.plan_id
LEFT JOIN subscriptions s ON s.tenant_id = t.id
LEFT JOIN tenant_billing tb ON tb.tenant_id = t.id;

GRANT SELECT ON admin_tenant_overview TO authenticated;
GRANT SELECT ON admin_tenant_overview TO service_role;
