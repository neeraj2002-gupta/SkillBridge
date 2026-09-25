-- Restore security_invoker view (no SECURITY DEFINER warning).
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
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

-- Replace the broad authenticated-discovery policy with a policy that allows
-- both anon and authenticated to read profile rows for discovery. RLS only
-- gates rows; column-level GRANTs gate which columns they can read.
DROP POLICY IF EXISTS "Authenticated can discover profiles" ON public.profiles;

CREATE POLICY "Public discovery of profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grant safe-only column SELECT to anon (for unauthenticated discovery).
GRANT SELECT (
  id, display_name, avatar_url, bio, role, location, category, rating,
  user_status, institution_name, created_at, updated_at
) ON public.profiles TO anon;
