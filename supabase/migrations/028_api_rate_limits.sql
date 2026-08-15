-- Rate limiting persistente para operacoes caras e endpoints sensiveis.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key           text PRIMARY KEY,
  window_start  timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies: somente service_role acessa diretamente.

CREATE OR REPLACE FUNCTION consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO api_rate_limits AS limits (key, window_start, request_count, updated_at)
  VALUES (p_key, now(), 1, now())
  ON CONFLICT (key) DO UPDATE
  SET
    window_start = CASE
      WHEN limits.window_start <= now() - make_interval(secs => p_window_seconds)
      THEN now()
      ELSE limits.window_start
    END,
    request_count = CASE
      WHEN limits.window_start <= now() - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE limits.request_count + 1
    END,
    updated_at = now()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION consume_api_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION consume_api_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION consume_api_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION consume_api_rate_limit(text, integer, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at ON api_rate_limits(updated_at);
