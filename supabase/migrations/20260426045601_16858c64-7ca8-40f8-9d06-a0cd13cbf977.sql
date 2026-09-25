-- Make profiles_public a SECURITY DEFINER-like view so it can read rows for anon users,
-- but still only exposes the safe columns.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  id,
  display_name,
  avatar_url,
  bio,
  role,
  location,
  category,
  rating,
  user_status,
  institution_name,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
