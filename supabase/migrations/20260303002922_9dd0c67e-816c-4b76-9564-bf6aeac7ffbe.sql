CREATE OR REPLACE FUNCTION public.cleanup_invalid_consultant_ids()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
  non_consultant_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT c.consultant_id)
  INTO non_consultant_ids
  FROM contacts c
  WHERE c.consultant_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = c.consultant_id 
        AND ur.role = 'consultant'
    );

  IF non_consultant_ids IS NOT NULL AND array_length(non_consultant_ids, 1) > 0 THEN
    UPDATE contacts
    SET consultant_id = NULL
    WHERE consultant_id = ANY(non_consultant_ids);
    
    GET DIAGNOSTICS affected = ROW_COUNT;
  ELSE
    affected := 0;
  END IF;

  RETURN affected;
END;
$$;