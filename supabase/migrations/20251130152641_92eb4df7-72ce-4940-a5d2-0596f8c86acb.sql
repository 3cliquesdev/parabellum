-- FASE 4: Vector Deduplication
-- Function to find similar articles based on embedding similarity

CREATE OR REPLACE FUNCTION find_similar_articles(
  article_id UUID,
  similarity_threshold FLOAT DEFAULT 0.90,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ka.id,
    ka.title,
    ka.category,
    1 - (ka.embedding <=> (SELECT embedding FROM knowledge_articles WHERE knowledge_articles.id = article_id)) as similarity
  FROM knowledge_articles ka
  WHERE 
    ka.id != article_id
    AND ka.embedding IS NOT NULL
    AND ka.is_published = true
    AND (1 - (ka.embedding <=> (SELECT embedding FROM knowledge_articles WHERE knowledge_articles.id = article_id))) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$;

-- Function to check for duplicates before saving (returns warning if found)
CREATE OR REPLACE FUNCTION check_duplicate_articles(
  p_content TEXT,
  p_article_id UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.90
)
RETURNS TABLE (
  similar_count INT,
  top_similar_title TEXT,
  top_similar_id UUID,
  top_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- This is a placeholder - actual embedding generation happens in edge function
  -- This function is called AFTER embedding is generated
  
  IF p_article_id IS NOT NULL THEN
    SELECT embedding INTO query_embedding 
    FROM knowledge_articles 
    WHERE id = p_article_id;
    
    IF query_embedding IS NULL THEN
      RETURN QUERY SELECT 0::INT, NULL::TEXT, NULL::UUID, 0::FLOAT;
      RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
      COUNT(*)::INT as similar_count,
      (SELECT ka.title FROM knowledge_articles ka 
       WHERE ka.id != p_article_id 
         AND ka.embedding IS NOT NULL 
         AND ka.is_published = true
         AND (1 - (ka.embedding <=> query_embedding)) >= similarity_threshold
       ORDER BY (1 - (ka.embedding <=> query_embedding)) DESC
       LIMIT 1) as top_similar_title,
      (SELECT ka.id FROM knowledge_articles ka 
       WHERE ka.id != p_article_id 
         AND ka.embedding IS NOT NULL 
         AND ka.is_published = true
         AND (1 - (ka.embedding <=> query_embedding)) >= similarity_threshold
       ORDER BY (1 - (ka.embedding <=> query_embedding)) DESC
       LIMIT 1) as top_similar_id,
      (SELECT (1 - (ka.embedding <=> query_embedding)) FROM knowledge_articles ka 
       WHERE ka.id != p_article_id 
         AND ka.embedding IS NOT NULL 
         AND ka.is_published = true
         AND (1 - (ka.embedding <=> query_embedding)) >= similarity_threshold
       ORDER BY (1 - (ka.embedding <=> query_embedding)) DESC
       LIMIT 1) as top_similarity
    FROM knowledge_articles ka
    WHERE ka.id != p_article_id 
      AND ka.embedding IS NOT NULL 
      AND ka.is_published = true
      AND (1 - (ka.embedding <=> query_embedding)) >= similarity_threshold;
  ELSE
    RETURN QUERY SELECT 0::INT, NULL::TEXT, NULL::UUID, 0::FLOAT;
  END IF;
END;
$$;