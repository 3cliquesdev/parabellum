-- ============================================
-- FORM BUILDER V3 - ENTERPRISE SCHEMA
-- ============================================

-- 1. Form Conditions (Branching Ilimitado)
CREATE TABLE public.form_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  parent_condition_id UUID REFERENCES public.form_conditions(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL DEFAULT 'show_field',
  operator TEXT NOT NULL,
  value JSONB,
  target_field_id TEXT,
  target_value JSONB,
  logic_group TEXT DEFAULT 'AND',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Form Calculations (Scores e Fórmulas)
CREATE TABLE public.form_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  result_type TEXT DEFAULT 'number',
  display_in_results BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Form Automations (Disparos Automáticos)
CREATE TABLE public.form_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'on_submit',
  trigger_config JSONB,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Form Submissions (Histórico Completo)
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  answers JSONB NOT NULL,
  calculated_scores JSONB,
  automations_triggered JSONB,
  session_metadata JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes for performance
CREATE INDEX idx_form_conditions_form_id ON public.form_conditions(form_id);
CREATE INDEX idx_form_conditions_parent ON public.form_conditions(parent_condition_id);
CREATE INDEX idx_form_calculations_form_id ON public.form_calculations(form_id);
CREATE INDEX idx_form_automations_form_id ON public.form_automations(form_id);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_contact_id ON public.form_submissions(contact_id);

-- 6. Enable RLS
ALTER TABLE public.form_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for form_conditions
CREATE POLICY "Admin/Manager can manage form_conditions"
ON public.form_conditions FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Authenticated can view form_conditions"
ON public.form_conditions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 8. RLS Policies for form_calculations
CREATE POLICY "Admin/Manager can manage form_calculations"
ON public.form_calculations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Authenticated can view form_calculations"
ON public.form_calculations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 9. RLS Policies for form_automations
CREATE POLICY "Admin/Manager can manage form_automations"
ON public.form_automations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Authenticated can view form_automations"
ON public.form_automations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 10. RLS Policies for form_submissions
CREATE POLICY "Admin/Manager can manage form_submissions"
ON public.form_submissions FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'general_manager'));

CREATE POLICY "Public can insert form_submissions"
ON public.form_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated can view form_submissions"
ON public.form_submissions FOR SELECT
USING (auth.uid() IS NOT NULL);