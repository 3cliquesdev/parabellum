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
  test_val text;
BEGIN
  SELECT consultant_id INTO before_val FROM contacts WHERE id = p_contact_id;
  
  -- Try setting to a known consultant ID first
  UPDATE contacts SET consultant_id = NULL::uuid WHERE id = p_contact_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  
  SELECT consultant_id INTO after_val FROM contacts WHERE id = p_contact_id;
  
  -- Also test with raw EXECUTE
  EXECUTE 'UPDATE public.contacts SET consultant_id = $1 WHERE id = $2' USING NULL::uuid, p_contact_id;
  
  SELECT consultant_id::text INTO test_val FROM contacts WHERE id = p_contact_id;
  
  RETURN jsonb_build_object(
    'before', before_val::text,
    'after_direct', after_val::text,
    'after_execute', test_val,
    'rows_affected', affected,
    'is_null_after', (after_val IS NULL)
  );
END;
$$;