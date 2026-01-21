
-- Backfill corrigido: incluir TODOS os event_types relevantes (especialmente 'paid')
UPDATE public.deals d
SET kiwify_offer_id = subq.offer_id
FROM (
  SELECT DISTINCT ON (d2.id) 
    d2.id as deal_id,
    COALESCE(
      k.payload->'Subscription'->'plan'->>'id',
      k.payload->'Product'->>'product_offer_id',
      k.offer_id
    ) as offer_id
  FROM public.deals d2
  LEFT JOIN public.contacts c ON c.id = d2.contact_id
  JOIN public.kiwify_events k ON k.payload->'Customer'->>'email' = COALESCE(c.email, d2.lead_email)
  WHERE d2.status = 'won'
    AND d2.kiwify_offer_id IS NULL
    AND COALESCE(c.email, d2.lead_email) IS NOT NULL
  ORDER BY d2.id, k.created_at DESC
) subq
WHERE d.id = subq.deal_id
  AND subq.offer_id IS NOT NULL;
