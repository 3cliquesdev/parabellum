-- Remove 8 orphaned edges (e_20_30 through e_27_30) from FLUXO MASTER V4
UPDATE chat_flows 
SET flow_definition = jsonb_set(
  flow_definition::jsonb,
  '{edges}',
  (
    SELECT jsonb_agg(edge)
    FROM jsonb_array_elements(flow_definition::jsonb->'edges') AS edge
    WHERE edge->>'id' NOT IN ('e_20_30', 'e_21_30', 'e_22_30', 'e_23_30', 'e_24_30', 'e_25_30', 'e_26_30', 'e_27_30')
  )
),
updated_at = now()
WHERE id = '9926200d-5f15-429a-ae98-9adedb2e4f65';