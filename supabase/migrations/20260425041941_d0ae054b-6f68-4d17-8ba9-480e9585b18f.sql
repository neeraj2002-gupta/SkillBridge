-- Add new optional profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_status text NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS id_number text;

-- Update the new-user handler to capture status + institution from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, email, avatar_url, user_status, institution_name, id_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'user_status', 'Other'),
    nullif(new.raw_user_meta_data ->> 'institution_name', ''),
    nullif(new.raw_user_meta_data ->> 'id_number', '')
  );
  return new;
end;
$function$;