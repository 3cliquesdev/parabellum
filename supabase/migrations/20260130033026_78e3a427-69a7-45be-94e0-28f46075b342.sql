-- ========================================
-- FASE 2: AJUSTES FINOS (7 melhorias)
-- ========================================

-- 1️⃣ Adicionar coluna learned_at em conversations (evitar loop de aprendizado)
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS learned_at TIMESTAMPTZ;

-- Índice para buscar conversas não processadas
CREATE INDEX IF NOT EXISTS idx_conversations_learned_at 
  ON conversations(learned_at) WHERE learned_at IS NULL;

-- 2️⃣ Adicionar colunas de dual confidence em knowledge_candidates
ALTER TABLE public.knowledge_candidates
  ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS system_confidence_score INTEGER;

-- Comentário explicativo
COMMENT ON COLUMN knowledge_candidates.ai_confidence_score IS 'Score de confiança retornado pela IA (0-100)';
COMMENT ON COLUMN knowledge_candidates.system_confidence_score IS 'Score calculado pelo sistema com base em critérios objetivos';
COMMENT ON COLUMN knowledge_candidates.confidence_score IS 'Score final = min(ai_confidence, system_confidence)';

-- 3️⃣ Adicionar coluna published em knowledge_articles (separate de is_published)
-- Nota: is_published já existe, vamos adicionar embedding_generated para controle
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS embedding_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 4️⃣ Atualizar trigger de versionamento para verificar campos relevantes
CREATE OR REPLACE FUNCTION create_knowledge_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 🆕 FASE 2: Versionar APENAS quando conteúdo relevante muda
  -- NÃO versionar: tags, category, metadata
  IF (OLD.content IS DISTINCT FROM NEW.content) OR
     (OLD.solution IS DISTINCT FROM NEW.solution) OR
     (OLD.when_to_use IS DISTINCT FROM NEW.when_to_use) OR
     (OLD.when_not_to_use IS DISTINCT FROM NEW.when_not_to_use) THEN
    
    INSERT INTO knowledge_versions (
      knowledge_article_id,
      version,
      title,
      content,
      category,
      tags,
      changed_by,
      change_reason,
      created_at
    ) VALUES (
      OLD.id,
      COALESCE(OLD.version, 1),
      OLD.title,
      OLD.content,
      OLD.category,
      OLD.tags,
      NEW.approved_by, -- Quem está fazendo a alteração
      'Atualização de conteúdo',
      NOW()
    );
    
    -- Incrementar versão
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir e recriar
DROP TRIGGER IF EXISTS trg_knowledge_version ON knowledge_articles;
CREATE TRIGGER trg_knowledge_version
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION create_knowledge_version();

-- 5️⃣ RLS para novas colunas
-- Já coberto pelas policies existentes

-- 6️⃣ Índice para busca de candidatos duplicados
CREATE INDEX IF NOT EXISTS idx_knowledge_candidates_problem 
  ON knowledge_candidates USING gin(to_tsvector('portuguese', problem));

-- 7️⃣ Atualizar comentários
COMMENT ON COLUMN conversations.learned_at IS 'Timestamp de quando conhecimento foi extraído desta conversa (evita reprocessamento)';