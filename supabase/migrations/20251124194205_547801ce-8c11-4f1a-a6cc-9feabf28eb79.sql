-- Subfase 9D: Adicionar pipeline_id aos deals
-- Passo 1: Adicionar coluna pipeline_id (nullable inicialmente)
ALTER TABLE deals 
ADD COLUMN pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;

-- Passo 2: Preencher deals existentes com pipeline default
UPDATE deals 
SET pipeline_id = (SELECT id FROM pipelines WHERE is_default = true LIMIT 1)
WHERE pipeline_id IS NULL;

-- Passo 3: Tornar pipeline_id obrigatório para novos deals
ALTER TABLE deals 
ALTER COLUMN pipeline_id SET NOT NULL;

-- Passo 4: Criar índice para melhor performance
CREATE INDEX idx_deals_pipeline_id ON deals(pipeline_id);