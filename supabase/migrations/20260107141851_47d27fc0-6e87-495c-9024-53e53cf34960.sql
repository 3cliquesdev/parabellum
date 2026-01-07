-- Tabela de configuração de scoring por campo
CREATE TABLE public.scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  value_rules JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de faixas de classificação
CREATE TABLE public.scoring_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification TEXT NOT NULL UNIQUE,
  min_score INTEGER NOT NULL,
  max_score INTEGER,
  color TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campos de score na tabela onboarding_submissions
ALTER TABLE public.onboarding_submissions
  ADD COLUMN IF NOT EXISTS score_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Adicionar campos de lead score na tabela contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_classification TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_submission_id UUID REFERENCES onboarding_submissions(id);

-- Enable RLS
ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_ranges ENABLE ROW LEVEL SECURITY;

-- Políticas para scoring_config (admin pode gerenciar, todos podem ler)
CREATE POLICY "Anyone can read scoring_config" ON public.scoring_config
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage scoring_config" ON public.scoring_config
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para scoring_ranges
CREATE POLICY "Anyone can read scoring_ranges" ON public.scoring_ranges
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage scoring_ranges" ON public.scoring_ranges
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Função para calcular score do lead
CREATE OR REPLACE FUNCTION public.calculate_lead_score(submission_id UUID)
RETURNS INTEGER AS $$
DECLARE
  submission RECORD;
  config RECORD;
  rule JSONB;
  total_score INTEGER := 0;
  breakdown JSONB := '{}';
  field_value TEXT;
  field_score INTEGER;
  classification_result TEXT := 'frio';
BEGIN
  -- Buscar submission
  SELECT * INTO submission FROM onboarding_submissions WHERE id = submission_id;
  
  IF submission IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Iterar por cada configuração ativa
  FOR config IN SELECT * FROM scoring_config WHERE is_active = true LOOP
    field_score := 0;
    field_value := NULL;
    
    -- Mapear campo para valor
    CASE config.field_name
      WHEN 'knowledge_it' THEN field_value := submission.knowledge_it::TEXT;
      WHEN 'knowledge_internet' THEN field_value := submission.knowledge_internet::TEXT;
      WHEN 'dropshipping_experience' THEN field_value := submission.dropshipping_experience;
      WHEN 'has_online_store' THEN field_value := submission.has_online_store::TEXT;
      WHEN 'formalization' THEN field_value := submission.formalization;
      WHEN 'investment_budget' THEN field_value := submission.investment_budget;
      WHEN 'main_device' THEN field_value := submission.main_device;
      ELSE field_value := NULL;
    END CASE;
    
    IF field_value IS NOT NULL THEN
      -- Verificar regras
      FOR rule IN SELECT * FROM jsonb_array_elements(config.value_rules) LOOP
        -- Regra por valor exato (textos)
        IF rule->>'value' IS NOT NULL AND field_value = rule->>'value' THEN
          field_score := COALESCE((rule->>'points')::INTEGER, 0);
          EXIT;
        END IF;
        
        -- Regra por range (números)
        IF rule->>'min' IS NOT NULL AND field_value ~ '^[0-9]+$' THEN
          IF field_value::INTEGER >= (rule->>'min')::INTEGER 
             AND field_value::INTEGER <= COALESCE((rule->>'max')::INTEGER, 999) THEN
            field_score := COALESCE((rule->>'points')::INTEGER, 0);
            EXIT;
          END IF;
        END IF;
      END LOOP;
      
      breakdown := breakdown || jsonb_build_object(config.field_name, field_score);
    END IF;
    
    total_score := total_score + field_score;
  END LOOP;
  
  -- Determinar classificação
  SELECT sr.classification INTO classification_result 
  FROM scoring_ranges sr
  WHERE total_score >= sr.min_score 
    AND (sr.max_score IS NULL OR total_score <= sr.max_score)
  ORDER BY sr.min_score DESC
  LIMIT 1;
  
  IF classification_result IS NULL THEN
    classification_result := 'frio';
  END IF;
  
  -- Atualizar submission com score e classificação
  UPDATE onboarding_submissions
  SET 
    score_total = total_score,
    score_breakdown = breakdown,
    classification = classification_result
  WHERE id = submission_id;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para calcular score automaticamente após insert
CREATE OR REPLACE FUNCTION public.trigger_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_lead_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_onboarding_submission_score ON onboarding_submissions;
CREATE TRIGGER after_onboarding_submission_score
  AFTER INSERT ON onboarding_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();

-- Trigger para updated_at
CREATE TRIGGER update_scoring_config_updated_at
  BEFORE UPDATE ON scoring_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão de scoring
INSERT INTO scoring_config (field_name, field_label, value_rules) VALUES
('knowledge_it', 'Conhecimento em Informática', '[
  {"min": 0, "max": 2, "points": 0, "label": "Baixo"},
  {"min": 3, "max": 3, "points": 3, "label": "Médio"},
  {"min": 4, "max": 5, "points": 5, "label": "Alto"}
]'::jsonb),
('knowledge_internet', 'Conhecimento em Internet', '[
  {"min": 0, "max": 2, "points": 0, "label": "Baixo"},
  {"min": 3, "max": 3, "points": 3, "label": "Médio"},
  {"min": 4, "max": 5, "points": 5, "label": "Alto"}
]'::jsonb),
('dropshipping_experience', 'Experiência com Dropshipping', '[
  {"value": "nao_conheco", "points": 0, "label": "Não conhece"},
  {"value": "sim_nunca_vendi", "points": 5, "label": "Conhece mas nunca vendeu"},
  {"value": "sim_vendi", "points": 10, "label": "Já vendeu"}
]'::jsonb),
('has_online_store', 'Já teve loja online', '[
  {"value": "false", "points": 0, "label": "Não"},
  {"value": "true", "points": 5, "label": "Sim"}
]'::jsonb),
('formalization', 'Formalização', '[
  {"value": "nao_tenho", "points": 0, "label": "Não tem"},
  {"value": "pretendo_abrir", "points": 3, "label": "Pretende abrir"},
  {"value": "mei", "points": 7, "label": "Tem MEI"},
  {"value": "cnpj", "points": 10, "label": "Tem CNPJ"}
]'::jsonb),
('investment_budget', 'Orçamento de Investimento', '[
  {"value": "ate_500", "points": 1, "label": "Até R$ 500"},
  {"value": "500_1000", "points": 3, "label": "R$ 500-1k"},
  {"value": "1000_3000", "points": 5, "label": "R$ 1-3k"},
  {"value": "3000_5000", "points": 8, "label": "R$ 3-5k"},
  {"value": "acima_5000", "points": 10, "label": "Acima R$ 5k"}
]'::jsonb),
('main_device', 'Dispositivo Principal', '[
  {"value": "celular", "points": 2, "label": "Celular"},
  {"value": "computador", "points": 5, "label": "Computador"},
  {"value": "ambos", "points": 5, "label": "Ambos"}
]'::jsonb);

-- Inserir faixas de classificação padrão
INSERT INTO scoring_ranges (classification, min_score, max_score, color, priority) VALUES
('frio', 0, 15, '#EF4444', 1),
('morno', 16, 30, '#F59E0B', 5),
('quente', 31, NULL, '#22C55E', 10);