UPDATE public.user_access_profiles
SET is_customized = false,
    updated_at = now()
WHERE user_id = '4fdb23c0-bc51-4c61-9023-3e045ed2abf3'
  AND profile_definition_id = 'restrito';