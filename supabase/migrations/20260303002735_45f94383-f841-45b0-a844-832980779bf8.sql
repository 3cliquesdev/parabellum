CREATE OR REPLACE FUNCTION public.cleanup_invalid_consultant_ids()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE contacts
  SET consultant_id = NULL
  WHERE consultant_id IN (
    SELECT c.consultant_id
    FROM contacts c
    LEFT JOIN user_roles ur ON ur.user_id = c.consultant_id AND ur.role = 'consultant'
    WHERE c.consultant_id IS NOT NULL
      AND ur.user_id IS NULL
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;