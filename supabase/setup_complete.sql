-- ============================================================================
-- CISCO MEMBER HUB: COMPLETE DATABASE SETUP
-- Run this entire script in Supabase > SQL Editor > "New query" -> Click "Run"
-- ============================================================================

-- 1. Enable Cryptographic Extensions
create extension if not exists pgcrypto;

-- 2. Core Tables
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  role text default 'Member',
  department text,
  qr_token text unique,
  qr_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  description text,
  link text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  scanned_by uuid references auth.users(id),
  notes text
);

create table if not exists public.member_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid not null unique references public.members(id) on delete cascade
);

-- 3. Helper: Check if authenticated user is admin
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.admins enable row level security;
alter table public.members enable row level security;
alter table public.contributions enable row level security;
alter table public.attendance enable row level security;
alter table public.member_users enable row level security;

-- Drop existing policies if any to prevent conflicts when re-running
drop policy if exists "admin reads own row" on public.admins;
drop policy if exists "admins manage members" on public.members;
drop policy if exists "member reads own row" on public.members;
drop policy if exists "admins manage contributions" on public.contributions;
drop policy if exists "member reads own contributions" on public.contributions;
drop policy if exists "admins manage attendance" on public.attendance;
drop policy if exists "member reads own attendance" on public.attendance;
drop policy if exists "admins manage member_users" on public.member_users;
drop policy if exists "members read own link" on public.member_users;

-- Admin Policies
create policy "admin reads own row" on public.admins 
  for select using (user_id = auth.uid());

create policy "admins manage members" on public.members 
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage contributions" on public.contributions 
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage attendance" on public.attendance 
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage member_users" on public.member_users 
  for all using (public.is_admin()) with check (public.is_admin());

-- Member Read Policies (Logged in linked member can read their own row, works & attendance)
create policy "members read own link" on public.member_users 
  for select using (user_id = auth.uid());

create policy "member reads own row" on public.members 
  for select using (
    exists (select 1 from public.member_users mu where mu.user_id = auth.uid() and mu.member_id = id)
  );

create policy "member reads own contributions" on public.contributions 
  for select using (
    exists (select 1 from public.member_users mu where mu.user_id = auth.uid() and mu.member_id = member_id)
  );

create policy "member reads own attendance" on public.attendance 
  for select using (
    exists (select 1 from public.member_users mu where mu.user_id = auth.uid() and mu.member_id = member_id)
  );

-- 5. Stored Procedures / RPC Functions

-- Admin: Assign fresh unguessable 32-char hex QR token
create or replace function public.assign_qr(p_member uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  begin
    t := encode(extensions.gen_random_bytes(16), 'hex');
  exception when others then
    t := md5(random()::text || clock_timestamp()::text || p_member::text);
  end;
  update public.members set qr_token = t where id = p_member;
  return t;
end $$;
revoke all on function public.assign_qr(uuid) from public, anon;
grant execute on function public.assign_qr(uuid) to authenticated;

-- Public: QR scan endpoint. Returns only safe public fields.
create or replace function public.get_member_by_token(p_token text) returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'full_name', m.full_name,
    'role', m.role,
    'department', m.department,
    'joined', m.created_at,
    'contributions', coalesce((
      select json_agg(json_build_object(
        'title', c.title,
        'description', c.description,
        'link', c.link,
        'date', c.created_at
      ) order by c.created_at desc)
      from public.contributions c where c.member_id = m.id
    ), '[]'::json)
  )
  from public.members m
  where m.qr_token = p_token and m.is_active;
$$;
grant execute on function public.get_member_by_token(text) to anon, authenticated;

-- Admin: Check-in attendance when scanning a QR code
create or replace function public.record_attendance(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_member  public.members%rowtype;
  v_att_id  uuid;
  v_now     timestamptz := now();
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;

  select * into v_member from public.members
    where qr_token = p_token and is_active
    limit 1;
  if not found then raise exception 'member not found or inactive'; end if;

  insert into public.attendance (member_id, scanned_at, scanned_by)
    values (v_member.id, v_now, auth.uid())
    returning id into v_att_id;

  return json_build_object(
    'attendance_id', v_att_id,
    'member_name',   v_member.full_name,
    'member_role',   v_member.role,
    'scanned_at',    v_now
  );
end $$;
revoke all on function public.record_attendance(text) from public, anon;
grant execute on function public.record_attendance(text) to authenticated;

-- Member: Fetch personal profile, achievements & attendance history
create or replace function public.get_my_member_profile()
returns json language plpgsql security definer stable set search_path = public as $$
declare
  v_member_id uuid;
  v_result    json;
begin
  select mu.member_id into v_member_id
    from public.member_users mu where mu.user_id = auth.uid();
  if v_member_id is null then return null; end if;

  select json_build_object(
    'id',            m.id,
    'full_name',     m.full_name,
    'role',          m.role,
    'department',    m.department,
    'joined',        m.created_at,
    'is_active',     m.is_active,
    'contributions', coalesce((
      select json_agg(json_build_object(
        'id', c.id, 'title', c.title, 'description', c.description,
        'link', c.link, 'date', c.created_at
      ) order by c.created_at desc)
      from public.contributions c where c.member_id = m.id
    ), '[]'::json),
    'attendance', coalesce((
      select json_agg(json_build_object(
        'id', a.id, 'scanned_at', a.scanned_at, 'notes', a.notes
      ) order by a.scanned_at desc)
      from public.attendance a where a.member_id = m.id
    ), '[]'::json)
  ) into v_result
  from public.members m where m.id = v_member_id;

  return v_result;
end $$;
grant execute on function public.get_my_member_profile() to authenticated;

-- Admin: Link a member to an Auth User UUID
create or replace function public.link_member_user(p_member_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.member_users (user_id, member_id)
    values (p_user_id, p_member_id)
    on conflict (user_id) do update set member_id = excluded.member_id;
end $$;
revoke all on function public.link_member_user(uuid, uuid) from public, anon;
grant execute on function public.link_member_user(uuid, uuid) to authenticated;

-- Admin: Fetch attendance log for last N days
create or replace function public.get_attendance_log(p_days int default 30)
returns json language sql security definer stable set search_path = public as $$
  select coalesce(json_agg(row_to_json(t) order by t.scanned_at desc), '[]'::json)
  from (
    select a.id, a.scanned_at, a.notes, m.full_name as member_name, m.role as member_role
    from public.attendance a
    join public.members m on m.id = a.member_id
    where a.scanned_at >= now() - (p_days || ' days')::interval
  ) t;
$$;
revoke all on function public.get_attendance_log(int) from public, anon;
grant execute on function public.get_attendance_log(int) to authenticated;

-- 6. Storage Bucket for uploaded QR images
insert into storage.buckets (id, name, public) 
values ('qr-codes', 'qr-codes', false) 
on conflict do nothing;

drop policy if exists "admins manage qr files" on storage.objects;
create policy "admins manage qr files" on storage.objects for all
  using (bucket_id = 'qr-codes' and public.is_admin())
  with check (bucket_id = 'qr-codes' and public.is_admin());

-- 7. Table-level grants (required for RLS policies to work in Supabase)
-- Without these, Supabase returns "permission denied" even with RLS policies in place.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.admins      to authenticated;
grant select, insert, update, delete on public.members     to authenticated;
grant select, insert, update, delete on public.contributions to authenticated;
grant select, insert, update, delete on public.attendance  to authenticated;
grant select, insert, update, delete on public.member_users to authenticated;

-- anon can call the public QR scan function; no direct table access needed
grant select on public.members      to anon;
grant select on public.contributions to anon;

-- grant execute on is_admin to authenticated (security definer, used by app)
grant execute on function public.is_admin() to authenticated;
