-- Adicionar configuração de modelo AI padrão
INSERT INTO system_configurations (key, value, description, category)
VALUES ('ai_default_model', 'google/gemini-2.5-flash', 'Modelo AI padrão para todas as funções', 'ai')
ON CONFLICT (key) DO NOTHING;