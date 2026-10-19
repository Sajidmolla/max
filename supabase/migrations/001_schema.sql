-- MAX schema. Safe to run once in the Supabase SQL Editor. Non-destructive (no DROP of data tables).
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  thumbnail_url text,
  release_year int check (release_year between 1888 and 2100),
  duration_minutes int check (duration_minutes > 0),
  drive_file_id text not null check (drive_file_id ~ '^[A-Za-z0-9_-]{10,}$'),
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists videos_status_created on public.videos (status, created_at desc);
create index if not exists videos_category on public.videos (category_id, sort_order);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  progress_seconds int not null default 0 check (progress_seconds >= 0),
  last_watched timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists watch_history_recent on public.watch_history (user_id, last_watched desc);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values ('platform_name', '"MAX"') on conflict do nothing;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Helper functions (security definer, fixed search_path, avoid RLS recursion) ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
revoke all on function public.is_admin(), public.is_active_member() from public;
grant execute on function public.is_admin(), public.is_active_member() to authenticated;

create or replace function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;
revoke all on function public.touch_last_seen() from public;
grant execute on function public.touch_last_seen() to authenticated;

-- New auth users always become ordinary members. Admin is granted only manually (see README).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role, status)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1)), 'member', 'active');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Block privilege escalation: only an active admin (or the SQL editor / service role, where auth.uid() is null) may change role/status/email.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role <> old.role or new.status <> old.status or new.email <> old.email or new.id <> old.id then
      raise exception 'Not allowed to change role, status or email';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg before update on public.profiles for each row execute function public.protect_profile();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists videos_updated_at on public.videos;
create trigger videos_updated_at before update on public.videos for each row execute function public.set_updated_at();

-- Audit logging for admin changes to videos, categories, settings and profiles.
create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb; begin
  if auth.uid() is null or not public.is_admin() then return coalesce(new, old); end if;
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' and new.role = old.role and new.status = old.status then return new; end if;
  rec := to_jsonb(coalesce(new, old));
  insert into public.admin_audit_logs (admin_id, action, entity, entity_id, details)
  values (auth.uid(), tg_op, tg_table_name, coalesce(rec->>'id', rec->>'key'), jsonb_build_object('title', rec->>'title', 'name', rec->>'name', 'status', rec->>'status', 'role', rec->>'role'));
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['videos','categories','platform_settings','profiles'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit()', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.user_favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

-- profiles: read/update own (role/status protected by trigger); admin reads/updates all
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_delete_admin on public.profiles for delete to authenticated using (public.is_admin() and id <> auth.uid());

-- categories: active members read; admin writes
create policy categories_select on public.categories for select to authenticated using (public.is_active_member());
create policy categories_admin_ins on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_upd on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_del on public.categories for delete to authenticated using (public.is_admin());

-- videos: active members read published; admin reads/writes everything
create policy videos_select on public.videos for select to authenticated using ((status = 'published' and public.is_active_member()) or public.is_admin());
create policy videos_admin_ins on public.videos for insert to authenticated with check (public.is_admin());
create policy videos_admin_upd on public.videos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy videos_admin_del on public.videos for delete to authenticated using (public.is_admin());

-- personal tables: own rows only, active members only
create policy fav_all on public.user_favorites for all to authenticated using (user_id = auth.uid() and public.is_active_member()) with check (user_id = auth.uid() and public.is_active_member());
create policy hist_all on public.watch_history for all to authenticated using (user_id = auth.uid() and public.is_active_member()) with check (user_id = auth.uid() and public.is_active_member());

-- settings: members read (name/logo shown in UI); admin writes
create policy settings_select on public.platform_settings for select to authenticated using (public.is_active_member());
create policy settings_admin_ins on public.platform_settings for insert to authenticated with check (public.is_admin());
create policy settings_admin_upd on public.platform_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_del on public.platform_settings for delete to authenticated using (public.is_admin());

-- audit logs: admin read only (rows are written by the trigger)
create policy audit_select on public.admin_audit_logs for select to authenticated using (public.is_admin());

-- Seed default categories (idempotent)
insert into public.categories (name, sort_order) values
 ('Family Favorites',1),('Action',2),('Comedy',3),('Drama',4),('Documentary',5),('Kids & Family',6),('Other Videos',7)
on conflict (name) do nothing;
