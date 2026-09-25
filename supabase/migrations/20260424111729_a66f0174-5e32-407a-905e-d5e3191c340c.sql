-- Skill type enum
create type public.skill_type as enum ('teach', 'learn');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  avatar_url text,
  bio text not null default '',
  role text not null default '',
  location text not null default '',
  category text not null default 'Tech',
  rating numeric(3,2) not null default 5.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Skills table
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.skill_type not null,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create index skills_user_id_idx on public.skills(user_id);
create index skills_type_idx on public.skills(type);

alter table public.skills enable row level security;

create policy "Skills are viewable by everyone"
  on public.skills for select
  using (true);

create policy "Users can insert their own skills"
  on public.skills for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own skills"
  on public.skills for update
  using (auth.uid() = user_id);

create policy "Users can delete their own skills"
  on public.skills for delete
  using (auth.uid() = user_id);

-- Trigger: keep updated_at fresh on profiles
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Trigger: auto-create profile on new signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
