create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text,
  completion int not null default 0 check (completion between 0 and 100),
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.user_saves(
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb, -- {scene, position:[x,y,z], rotY, inventory:[], unlockedScenes:[], achievements:[], flags:{}}
  updated_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.user_saves enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid()=id);
create policy "own profile write" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "own save read" on public.user_saves for select using (auth.uid()=user_id);
create policy "own save write" on public.user_saves for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into public.profiles(id,display_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'avatar_url') on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
