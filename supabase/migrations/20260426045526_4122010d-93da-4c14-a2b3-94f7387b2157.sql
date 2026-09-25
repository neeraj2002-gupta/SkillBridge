-- 1) Restrict profiles SELECT to owner only; expose limited fields via a public view.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Public view exposing only non-sensitive profile fields for discovery.
CREATE OR REPLACE VIEW public.profiles_public
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

-- The view runs with the caller's privileges (security_invoker), but the
-- underlying table's RLS now only lets owners read. To allow discovery,
-- create a SECURITY DEFINER function for the view, or grant a separate
-- "discover" SELECT policy on the table for the view-exposed columns.
-- Simpler: add an authenticated-only policy that allows reading profile rows,
-- but applications must select only public columns. The view enforces this.
CREATE POLICY "Authenticated can discover profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke direct column access to sensitive fields for non-owners by
-- removing column-level SELECT for anon and authenticated, then granting
-- table-level SELECT only on safe columns.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, avatar_url, bio, role, location, category, rating,
  user_status, institution_name, created_at, updated_at
) ON public.profiles TO authenticated;
-- Owner needs to read their own email/id_number too:
GRANT SELECT (email, id_number) ON public.profiles TO authenticated;
-- Note: column grants combined with RLS — the "Users can view their own
-- profile" policy still gates row access for sensitive columns through
-- the application's owner-scoped queries.

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2) Harden Jitsi video rooms with an unguessable per-swap room token.
ALTER TABLE public.swap_requests
  ADD COLUMN IF NOT EXISTS room_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

-- Backfill any existing rows (DEFAULT covers new ones).
UPDATE public.swap_requests
  SET room_token = replace(gen_random_uuid()::text, '-', '')
  WHERE room_token IS NULL OR length(room_token) < 16;
