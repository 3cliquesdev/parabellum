
-- =====================================================
-- CORRIGIR RLS: Dar acesso total ao support_manager
-- Igual a cs_manager, financial_manager, general_manager
-- =====================================================

-- 1. CONTACTS - Adicionar support_manager ao UPDATE
DROP POLICY IF EXISTS "role_based_update_contacts" ON contacts;
CREATE POLICY "role_based_update_contacts" ON contacts
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'financial_manager') OR
  (has_role(auth.uid(), 'sales_rep') AND assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'financial_manager') OR
  (has_role(auth.uid(), 'sales_rep') AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

-- 2. CONTACTS - Adicionar support_manager ao INSERT
DROP POLICY IF EXISTS "role_based_insert_contacts" ON contacts;
CREATE POLICY "role_based_insert_contacts" ON contacts
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'financial_manager') OR
  (has_role(auth.uid(), 'sales_rep') AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

-- 3. CONTACTS - Adicionar support_manager ao DELETE
DROP POLICY IF EXISTS "role_based_delete_contacts" ON contacts;
CREATE POLICY "role_based_delete_contacts" ON contacts
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'general_manager') OR
  has_role(auth.uid(), 'cs_manager') OR
  has_role(auth.uid(), 'support_manager') OR
  has_role(auth.uid(), 'financial_manager')
);

-- 4. DEALS - Adicionar support_manager ao SELECT
DROP POLICY IF EXISTS "support_manager_can_view_deals" ON deals;
CREATE POLICY "support_manager_can_view_deals" ON deals
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support_manager'));

-- 5. TICKETS - Verificar e adicionar support_manager
DROP POLICY IF EXISTS "support_manager_full_access_tickets" ON tickets;
CREATE POLICY "support_manager_full_access_tickets" ON tickets
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 6. PROFILES - Garantir que support_manager pode ver todos os profiles
DROP POLICY IF EXISTS "support_manager_can_view_all_profiles" ON profiles;
CREATE POLICY "support_manager_can_view_all_profiles" ON profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support_manager'));

-- 7. PROFILES - Garantir que support_manager pode atualizar profiles
DROP POLICY IF EXISTS "support_manager_can_update_profiles" ON profiles;
CREATE POLICY "support_manager_can_update_profiles" ON profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 8. USER_ROLES - Garantir que support_manager pode ver roles (para gerenciamento de equipe)
DROP POLICY IF EXISTS "support_manager_can_view_user_roles" ON user_roles;
CREATE POLICY "support_manager_can_view_user_roles" ON user_roles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support_manager'));

-- 9. ACTIVITIES - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_activities" ON activities;
CREATE POLICY "support_manager_can_manage_activities" ON activities
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 10. CONVERSATION_RATINGS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_view_ratings" ON conversation_ratings;
CREATE POLICY "support_manager_can_view_ratings" ON conversation_ratings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 11. AI_QUALITY_LOGS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_view_ai_logs" ON ai_quality_logs;
CREATE POLICY "support_manager_can_view_ai_logs" ON ai_quality_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 12. SLA_ALERTS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_sla_alerts" ON sla_alerts;
CREATE POLICY "support_manager_can_manage_sla_alerts" ON sla_alerts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 13. WHATSAPP_INSTANCES - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_view_whatsapp_instances" ON whatsapp_instances;
CREATE POLICY "support_manager_can_view_whatsapp_instances" ON whatsapp_instances
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support_manager'));

-- 14. TEAMS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_teams" ON teams;
CREATE POLICY "support_manager_can_manage_teams" ON teams
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 15. TEAM_MEMBERS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_team_members" ON team_members;
CREATE POLICY "support_manager_can_manage_team_members" ON team_members
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 16. CANNED_RESPONSES - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_canned_responses" ON canned_responses;
CREATE POLICY "support_manager_can_manage_canned_responses" ON canned_responses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 17. TAGS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_tags" ON tags;
CREATE POLICY "support_manager_can_manage_tags" ON tags
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 18. CONVERSATION_TAGS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_conversation_tags" ON conversation_tags;
CREATE POLICY "support_manager_can_manage_conversation_tags" ON conversation_tags
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 19. CHAT_FLOWS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_chat_flows" ON chat_flows;
CREATE POLICY "support_manager_can_manage_chat_flows" ON chat_flows
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));

-- 20. DEPARTMENTS - Adicionar support_manager ao SELECT
DROP POLICY IF EXISTS "support_manager_can_view_departments" ON departments;
CREATE POLICY "support_manager_can_view_departments" ON departments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'support_manager'));

-- 21. SUPPORT_CHANNELS - Adicionar support_manager
DROP POLICY IF EXISTS "support_manager_can_manage_channels" ON support_channels;
CREATE POLICY "support_manager_can_manage_channels" ON support_channels
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'support_manager'))
WITH CHECK (has_role(auth.uid(), 'support_manager'));
