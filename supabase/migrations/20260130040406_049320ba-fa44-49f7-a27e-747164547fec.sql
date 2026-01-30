-- =============================================
-- AJUSTE 1: Adicionar coluna needs_review
-- para rastreabilidade de drafts de IA
-- =============================================
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT true;

-- Índice parcial para buscar artigos pendentes de revisão
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_needs_review 
  ON knowledge_articles(needs_review, is_published) 
  WHERE needs_review = true AND is_published = false;