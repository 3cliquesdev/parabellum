-- Dropar view com bug
DROP VIEW IF EXISTS unmapped_kiwify_offers;

-- Recriar com o caminho correto para product_name
CREATE VIEW unmapped_kiwify_offers AS
WITH offer_aggregates AS (
  SELECT 
    COALESCE(
      payload->'Subscription'->'plan'->>'id',
      payload->'Product'->>'product_offer_id'
    ) as plan_id,
    COALESCE(
      payload->'Subscription'->'plan'->>'name',
      payload->'Product'->>'product_offer_name'
    ) as plan_name,
    -- CORREÇÃO: Usar 'product_name' ao invés de 'name'
    payload->'Product'->>'product_name' as kiwify_product_name,
    CASE 
      WHEN payload->'Commissions'->'commissioned_stores'->0->>'type' = 'affiliate' 
      THEN 'afiliado'
      ELSE 'organico'
    END as detected_source_type,
    COALESCE(
      (payload->>'order_value')::numeric,
      (payload->'Subscription'->>'value')::numeric,
      0
    ) as revenue
  FROM kiwify_events
  WHERE event_type IN ('paid', 'order_paid', 'order_approved')
    AND (
      payload->'Subscription'->'plan'->>'id' IS NOT NULL
      OR payload->'Product'->>'product_offer_id' IS NOT NULL
    )
)
SELECT 
  plan_id,
  MAX(plan_name) as plan_name,
  MAX(kiwify_product_name) as kiwify_product_name,
  MAX(detected_source_type) as detected_source_type,
  COUNT(*) as event_count,
  SUM(revenue) as total_revenue
FROM offer_aggregates
WHERE plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_offers po 
    WHERE po.offer_id = plan_id AND po.is_active = true
  )
GROUP BY plan_id
ORDER BY event_count DESC;