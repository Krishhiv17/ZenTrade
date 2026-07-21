-- ============================================================
-- Migration 020: Pre-launch waitlist
-- Run in Supabase Dashboard → SQL Editor AFTER 019.
--
-- Backs the coming-soon page's email capture. Anyone (anon) may INSERT;
-- duplicate emails are ignored (ON CONFLICT DO NOTHING). No SELECT policy,
-- so only the service role / dashboard can read the list (export to Loops).
-- Idempotent.
-- ============================================================

create table if not exists waitlist (
    id         uuid        primary key default gen_random_uuid(),
    email      text        not null unique,
    source     text,
    created_at timestamptz not null default now()
);

alter table waitlist enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename  = 'waitlist'
          and policyname = 'anyone can join the waitlist'
    ) then
        create policy "anyone can join the waitlist"
            on waitlist for insert
            to anon, authenticated
            with check (true);
    end if;
end $$;
