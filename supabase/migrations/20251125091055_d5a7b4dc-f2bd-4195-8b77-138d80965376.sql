-- =====================================================
-- FIX ALTERNATIVO: Políticas RLS sem TO authenticated
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "admins_managers_can_insert_personas" ON ai_personas;
DROP POLICY IF EXISTS "admins_managers_can_update_personas" ON ai_personas;
DROP POLICY IF EXISTS "admins_managers_can_delete_personas" ON ai_personas;

DROP POLICY IF EXISTS "admins_managers_can_insert_tools" ON ai_tools;
DROP POLICY IF EXISTS "admins_managers_can_update_tools" ON ai_tools;
DROP POLICY IF EXISTS "admins_managers_can_delete_tools" ON ai_tools;

DROP POLICY IF EXISTS "admins_managers_can_insert_routing_rules" ON ai_routing_rules;
DROP POLICY IF EXISTS "admins_managers_can_update_routing_rules" ON ai_routing_rules;
DROP POLICY IF EXISTS "admins_managers_can_delete_routing_rules" ON ai_routing_rules;

DROP POLICY IF EXISTS "admins_managers_can_insert_persona_tools" ON ai_persona_tools;
DROP POLICY IF EXISTS "admins_managers_can_update_persona_tools" ON ai_persona_tools;
DROP POLICY IF EXISTS "admins_managers_can_delete_persona_tools" ON ai_persona_tools;

-- =====================================================
-- TABELA: ai_personas - Políticas SEM TO authenticated
-- =====================================================

CREATE POLICY "admins_managers_can_insert_personas" 
ON ai_personas FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_update_personas" 
ON ai_personas FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_delete_personas" 
ON ai_personas FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- =====================================================
-- TABELA: ai_tools - Políticas SEM TO authenticated
-- =====================================================

CREATE POLICY "admins_managers_can_insert_tools" 
ON ai_tools FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_update_tools" 
ON ai_tools FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_delete_tools" 
ON ai_tools FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- =====================================================
-- TABELA: ai_routing_rules - Políticas SEM TO authenticated
-- =====================================================

CREATE POLICY "admins_managers_can_insert_routing_rules" 
ON ai_routing_rules FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_update_routing_rules" 
ON ai_routing_rules FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_delete_routing_rules" 
ON ai_routing_rules FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- =====================================================
-- TABELA: ai_persona_tools - Políticas SEM TO authenticated
-- =====================================================

CREATE POLICY "admins_managers_can_insert_persona_tools" 
ON ai_persona_tools FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_update_persona_tools" 
ON ai_persona_tools FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "admins_managers_can_delete_persona_tools" 
ON ai_persona_tools FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);