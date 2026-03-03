CREATE OR REPLACE FUNCTION public.cleanup_single_contact_test(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  before_val uuid;
  after_val uuid;
  affected integer;
BEGIN
  -- Get before value
  SELECT consultant_id INTO before_val FROM contacts WHERE id = p_contact_id;
  
  -- Update
  UPDATE contacts SET consultant_id = NULL WHERE id = p_contact_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  
  -- Get after value
  SELECT consultant_id INTO after_val FROM contacts WHERE id = p_contact_id;
  
  RETURN jsonb_build_object(
    'before', before_val,
    'after', after_val,
    'rows_affected', affected
  );
END;
$$;