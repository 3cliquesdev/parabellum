-- Cadastro publico e bloqueado. Um usuario novo so pode nascer a partir de um
-- invite_token valido, sendo vinculado diretamente ao tenant do convite.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.invite_tokens%ROWTYPE;
  v_token text := nullif(NEW.raw_user_meta_data->>'invite_token', '');
BEGIN
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Cadastro disponivel somente por convite';
  END IF;

  SELECT * INTO v_invite
  FROM public.invite_tokens
  WHERE token = v_token
    AND accepted_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(coalesce(NEW.email, ''))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite invalido, expirado ou destinado a outro e-mail';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_invite.tenant_id, NEW.id, v_invite.role);

  UPDATE public.invite_tokens SET accepted_at = now() WHERE id = v_invite.id;
  RETURN NEW;
END;
$$;
