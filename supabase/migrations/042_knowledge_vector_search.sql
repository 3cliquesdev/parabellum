-- Busca vetorial real na base de conhecimento (RAG). Ate aqui a busca do
-- agente de IA era so ILIKE por palavra-chave, que erra qualquer pergunta
-- fraseada diferente do texto do artigo. Aqui criamos a funcao que o app
-- (lib/omnichannel/inbound-automation.ts) ja tentava chamar via rpc, mas que
-- nunca tinha sido migrada (mais um gap dos commits 002-009 que faltaram).

CREATE OR REPLACE FUNCTION buscar_conhecimento(
  p_tenant_id uuid,
  query_embedding vector(768),
  match_count int DEFAULT 3,
  threshold float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  titulo text,
  conteudo text,
  categoria text,
  updated_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kb.id,
    kb.titulo,
    kb.conteudo,
    kb.categoria,
    kb.updated_at,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.tenant_id = p_tenant_id
    AND kb.publicado = true
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) >= threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;
