
-- =============================================
-- PASSO 1: Corrigir is_manager_or_admin (adicionar financial_manager)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','manager','general_manager','support_manager','cs_manager','financial_manager')
  );
$$;

-- =============================================
-- PASSO 2: Consolidar políticas — organizations
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_manager_update_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_update_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_manager_delete_organizations" ON organizations;
DROP POLICY IF EXISTS "role_based_delete_organizations" ON organizations;

CREATE POLICY "managers_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — activities
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_activities" ON activities;
DROP POLICY IF EXISTS "role_based_insert_activities" ON activities;
DROP POLICY IF EXISTS "admin_manager_update_activities" ON activities;
DROP POLICY IF EXISTS "role_based_update_activities" ON activities;
DROP POLICY IF EXISTS "admin_manager_delete_activities" ON activities;
DROP POLICY IF EXISTS "role_based_delete_activities" ON activities;

CREATE POLICY "managers_insert_activities" ON activities FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_activities" ON activities FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_activities" ON activities FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — admin_alerts
-- =============================================
DROP POLICY IF EXISTS "admin_manager_update_admin_alerts" ON admin_alerts;
DROP POLICY IF EXISTS "role_based_update_admin_alerts" ON admin_alerts;
DROP POLICY IF EXISTS "admin_manager_delete_admin_alerts" ON admin_alerts;
DROP POLICY IF EXISTS "role_based_delete_admin_alerts" ON admin_alerts;

CREATE POLICY "managers_update_admin_alerts" ON admin_alerts FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_admin_alerts" ON admin_alerts FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — ai_response_cache
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_ai_response_cache" ON ai_response_cache;
DROP POLICY IF EXISTS "role_based_insert_ai_response_cache" ON ai_response_cache;
DROP POLICY IF EXISTS "admin_manager_delete_ai_response_cache" ON ai_response_cache;
DROP POLICY IF EXISTS "role_based_delete_ai_response_cache" ON ai_response_cache;

CREATE POLICY "managers_insert_ai_response_cache" ON ai_response_cache FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_ai_response_cache" ON ai_response_cache FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — ai_suggestions
-- =============================================
DROP POLICY IF EXISTS "admin_manager_update_ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "role_based_update_ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "admin_manager_delete_ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "role_based_delete_ai_suggestions" ON ai_suggestions;

CREATE POLICY "managers_update_ai_suggestions" ON ai_suggestions FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_ai_suggestions" ON ai_suggestions FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — deals
-- =============================================
DROP POLICY IF EXISTS "admin_manager_delete_deals" ON deals;
DROP POLICY IF EXISTS "role_based_delete_deals" ON deals;

CREATE POLICY "managers_delete_deals" ON deals FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — knowledge_articles
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "role_based_insert_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "admin_manager_update_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "role_based_update_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "admin_manager_delete_knowledge_articles" ON knowledge_articles;
DROP POLICY IF EXISTS "role_based_delete_knowledge_articles" ON knowledge_articles;

CREATE POLICY "managers_insert_knowledge_articles" ON knowledge_articles FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_knowledge_articles" ON knowledge_articles FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_knowledge_articles" ON knowledge_articles FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — quotes
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_quotes" ON quotes;
DROP POLICY IF EXISTS "role_based_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "admin_manager_update_quotes" ON quotes;
DROP POLICY IF EXISTS "role_based_update_quotes" ON quotes;
DROP POLICY IF EXISTS "admin_manager_delete_quotes" ON quotes;
DROP POLICY IF EXISTS "role_based_delete_quotes" ON quotes;

CREATE POLICY "managers_insert_quotes" ON quotes FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_quotes" ON quotes FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_quotes" ON quotes FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — quote_items
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_quote_items" ON quote_items;
DROP POLICY IF EXISTS "role_based_insert_quote_items" ON quote_items;
DROP POLICY IF EXISTS "admin_manager_update_quote_items" ON quote_items;
DROP POLICY IF EXISTS "role_based_update_quote_items" ON quote_items;
DROP POLICY IF EXISTS "admin_manager_delete_quote_items" ON quote_items;
DROP POLICY IF EXISTS "role_based_delete_quote_items" ON quote_items;

CREATE POLICY "managers_insert_quote_items" ON quote_items FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_quote_items" ON quote_items FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_quote_items" ON quote_items FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =============================================
-- PASSO 3: Consolidar políticas — ticket_notification_rules
-- =============================================
DROP POLICY IF EXISTS "admin_manager_create_ticket_notification_rules" ON ticket_notification_rules;
DROP POLICY IF EXISTS "role_based_insert_ticket_notification_rules" ON ticket_notification_rules;
DROP POLICY IF EXISTS "admin_manager_update_ticket_notification_rules" ON ticket_notification_rules;
DROP POLICY IF EXISTS "role_based_update_ticket_notification_rules" ON ticket_notification_rules;
DROP POLICY IF EXISTS "admin_manager_delete_ticket_notification_rules" ON ticket_notification_rules;
DROP POLICY IF EXISTS "role_based_delete_ticket_notification_rules" ON ticket_notification_rules;

CREATE POLICY "managers_insert_ticket_notification_rules" ON ticket_notification_rules FOR INSERT
  TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_update_ticket_notification_rules" ON ticket_notification_rules FOR UPDATE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "managers_delete_ticket_notification_rules" ON ticket_notification_rules FOR DELETE
  TO authenticated USING (public.is_manager_or_admin(auth.uid()));
