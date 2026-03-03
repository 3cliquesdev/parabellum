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
  -- Get the list of non-consultant IDs
  SELECT array_agg(DISTINCT c.consultant_id)
  INTO non_consultant_ids
  FROM contacts c
  WHERE c.consultant_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = c.consultant_id 
        AND ur.role = 'consultant'
    );

  -- Perform the update
  IF non_consultant_ids IS NOT NULL AND array_length(non_consultant_ids, 1) > 0 THEN
    UPDATE contacts
    SET consultant_id = NULL
    WHERE consultant_id = ANY(non_consultant_ids);
    
    GET DIAGNOSTICS affected = ROW_COUNT;
  ELSE
    affected := 0;
  END IF;

  -- Log the action
  INSERT INTO audit_logs (action, table_name, old_data, new_data)
  VALUES (
    'cleanup_invalid_consultants',
    'contacts',
    jsonb_build_object('non_consultant_ids', non_consultant_ids),
    jsonb_build_object('rows_affected', affected)
  );

  RETURN affected;
END;
$$;