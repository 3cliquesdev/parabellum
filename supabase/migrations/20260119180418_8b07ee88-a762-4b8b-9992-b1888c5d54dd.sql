-- Migração de vendas Kiwify históricas para deals
-- Faz JOIN com contacts pelo email para obter contact_id

DO $$
DECLARE
  v_vendas_pipeline_id uuid := 'a272c23a-bcd8-411c-bbc1-706c2aa95055';
  v_vendas_stage_id uuid := '5ffeacc5-8ba9-433a-aff4-5b5ad5b40efb';
  v_recorrencia_pipeline_id uuid := '468a3d8c-fffc-44a5-a7b8-f788906dd492';
  v_recorrencia_stage_id uuid := '7e495f70-8435-4fcd-bf4d-3ea4d41b74bb';
  v_evento RECORD;
  v_new_deal_id uuid;
  v_is_first_purchase boolean;
  v_valor numeric;
  v_approved_date timestamp;
  v_product_name text;
  v_count integer := 0;
BEGIN
  -- Iterar sobre eventos sem deal vinculado, com JOIN em contacts
  FOR v_evento IN 
    SELECT 
      ke.id,
      ke.customer_email,
      ke.payload,
      c.id as contact_id,
      ke.created_at
    FROM kiwify_events ke
    INNER JOIN contacts c ON LOWER(c.email) = LOWER(ke.customer_email)
    WHERE ke.linked_deal_id IS NULL
      AND ke.event_type IN ('paid', 'order_paid', 'order_approved')
    ORDER BY ke.created_at
  LOOP
    -- Calcular valor líquido
    v_valor := COALESCE(
      (v_evento.payload->'Commissions'->>'my_commission')::numeric / 100,
      (v_evento.payload->'Commissions'->>'product_base_price')::numeric / 100,
      0
    );
    
    -- Obter data de aprovação
    v_approved_date := COALESCE(
      (v_evento.payload->>'approved_date')::timestamp,
      v_evento.created_at
    );
    
    -- Obter nome do produto
    v_product_name := COALESCE(
      v_evento.payload->'Product'->>'product_name',
      v_evento.payload->'Subscription'->'plan'->>'name',
      'Produto Kiwify'
    );
    
    -- Verificar se é primeira compra (não existe evento anterior para este email)
    SELECT NOT EXISTS (
      SELECT 1 FROM kiwify_events ke2 
      WHERE ke2.customer_email = v_evento.customer_email 
        AND ke2.event_type IN ('paid', 'order_paid', 'order_approved')
        AND COALESCE(
          (ke2.payload->>'approved_date')::timestamp,
          ke2.created_at
        ) < v_approved_date
    ) INTO v_is_first_purchase;
    
    -- Criar o deal
    INSERT INTO deals (
      id,
      title,
      contact_id,
      pipeline_id,
      stage_id,
      status,
      value,
      lead_source,
      is_organic_sale,
      is_returning_customer,
      created_at,
      closed_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      CASE 
        WHEN v_is_first_purchase THEN 'Venda Orgânica - ' || v_product_name
        ELSE 'Recorrência - ' || v_product_name
      END,
      v_evento.contact_id,
      CASE WHEN v_is_first_purchase THEN v_vendas_pipeline_id ELSE v_recorrencia_pipeline_id END,
      CASE WHEN v_is_first_purchase THEN v_vendas_stage_id ELSE v_recorrencia_stage_id END,
      'won',
      v_valor,
      CASE WHEN v_is_first_purchase THEN 'kiwify_direto' ELSE 'kiwify_recorrencia' END,
      true,
      NOT v_is_first_purchase,
      v_approved_date,
      v_approved_date,
      now()
    )
    RETURNING id INTO v_new_deal_id;
    
    -- Atualizar o evento com o deal vinculado
    UPDATE kiwify_events 
    SET linked_deal_id = v_new_deal_id 
    WHERE id = v_evento.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migração concluída: % deals criados', v_count;
END $$;