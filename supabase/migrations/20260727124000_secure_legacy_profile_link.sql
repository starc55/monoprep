CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_profile public.users%ROWTYPE;
  display_name text;
  legacy_profile_id text;
BEGIN
  SELECT *
  INTO existing_profile
  FROM public.users
  WHERE email = lower(NEW.email)
  LIMIT 1;

  legacy_profile_id := NULLIF(NEW.raw_app_meta_data ->> 'legacy_profile_id', '');

  IF existing_profile.id IS NOT NULL THEN
    IF existing_profile.auth_user_id = NEW.id THEN
      RETURN NEW;
    END IF;

    IF existing_profile.auth_user_id IS NULL
      AND legacy_profile_id = existing_profile.id
    THEN
      UPDATE public.users
      SET auth_user_id = NEW.id,
          password_hash = NULL,
          updated_at = now()
      WHERE id = existing_profile.id;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'This email belongs to a legacy MonoPrep account awaiting migration.';
  END IF;

  display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (
    id,
    auth_user_id,
    full_name,
    email,
    password_hash,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.id,
    display_name,
    lower(NEW.email),
    NULL,
    'STUDENT',
    'ACTIVE',
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET email = excluded.email,
      updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
