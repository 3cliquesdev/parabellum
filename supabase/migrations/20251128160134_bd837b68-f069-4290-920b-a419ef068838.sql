-- FASE 1: Add first_response_at columns and triggers

-- Add columns
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

-- Trigger for conversations: update first_response_at on first agent message
CREATE OR REPLACE FUNCTION update_conversation_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'user' THEN
    UPDATE conversations 
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id 
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_first_response
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_first_response();

-- Trigger for tickets: update first_response_at on first non-internal agent comment
CREATE OR REPLACE FUNCTION update_ticket_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_internal = false AND NEW.created_by IS NOT NULL THEN
    UPDATE tickets 
    SET first_response_at = NEW.created_at
    WHERE id = NEW.ticket_id 
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_ticket_first_response
AFTER INSERT ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION update_ticket_first_response();

-- FASE 3: Database Functions for complex metrics

-- Function: Average First Response Time in minutes
CREATE OR REPLACE FUNCTION get_avg_first_response_time(p_start timestamptz, p_end timestamptz)
RETURNS numeric AS $$
DECLARE
  avg_minutes numeric;
BEGIN
  SELECT AVG(
    EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60
  ) INTO avg_minutes
  FROM conversations
  WHERE created_at BETWEEN p_start AND p_end
    AND first_response_at IS NOT NULL;
  
  RETURN COALESCE(avg_minutes, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Average Resolution Time in minutes
CREATE OR REPLACE FUNCTION get_avg_resolution_time(p_start timestamptz, p_end timestamptz)
RETURNS numeric AS $$
DECLARE
  avg_minutes numeric;
BEGIN
  SELECT AVG(
    EXTRACT(EPOCH FROM (closed_at - created_at)) / 60
  ) INTO avg_minutes
  FROM conversations
  WHERE created_at BETWEEN p_start AND p_end
    AND closed_at IS NOT NULL;
  
  RETURN COALESCE(avg_minutes, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Conversation volume heatmap by day of week and hour
CREATE OR REPLACE FUNCTION get_conversation_heatmap(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(day_of_week int, hour_of_day int, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM created_at)::int as day_of_week,
    EXTRACT(HOUR FROM created_at)::int as hour_of_day,
    COUNT(*)::bigint as count
  FROM conversations
  WHERE created_at BETWEEN p_start AND p_end
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;