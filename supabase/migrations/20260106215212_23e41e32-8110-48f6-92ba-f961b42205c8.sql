-- Add max_submissions_per_contact column to forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS max_submissions_per_contact INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.forms.max_submissions_per_contact IS 'Maximum number of times a contact (by email) can submit this form. NULL means unlimited.';

-- Create function to check submission limit
CREATE OR REPLACE FUNCTION public.check_submission_limit(
  p_form_id UUID,
  p_email TEXT
) RETURNS JSON AS $$
DECLARE
  v_max_submissions INTEGER;
  v_current_count INTEGER;
  v_contact_id UUID;
BEGIN
  -- Get form's max submissions limit
  SELECT max_submissions_per_contact INTO v_max_submissions
  FROM public.forms WHERE id = p_form_id;
  
  -- If limit is NULL, always allow (unlimited)
  IF v_max_submissions IS NULL THEN
    RETURN json_build_object('allowed', true, 'remaining', null, 'current_count', 0);
  END IF;
  
  -- Find contact by email
  SELECT id INTO v_contact_id 
  FROM public.contacts 
  WHERE LOWER(email) = LOWER(p_email);
  
  -- If contact doesn't exist, it's their first submission
  IF v_contact_id IS NULL THEN
    RETURN json_build_object('allowed', true, 'remaining', v_max_submissions, 'current_count', 0);
  END IF;
  
  -- Count existing submissions for this form by this contact
  SELECT COUNT(*) INTO v_current_count
  FROM public.form_submissions
  WHERE form_id = p_form_id AND contact_id = v_contact_id;
  
  -- Check if limit reached
  IF v_current_count >= v_max_submissions THEN
    RETURN json_build_object(
      'allowed', false, 
      'remaining', 0,
      'current_count', v_current_count,
      'message', 'Você já preencheu este formulário o número máximo de vezes permitido.'
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true, 
    'remaining', v_max_submissions - v_current_count,
    'current_count', v_current_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;