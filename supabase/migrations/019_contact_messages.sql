-- ============================================================
-- Migration 019: Contact form submissions
-- Run in Supabase Dashboard → SQL Editor AFTER 018.
--
-- Backs the public /contact form. Anyone (anon) may INSERT a message;
-- nobody can SELECT through the client API — only the service role /
-- Supabase dashboard can read submissions. Fully idempotent.
-- ============================================================

create table if not exists contact_messages (
    id         uuid primary key default gen_random_uuid(),
    name       text        not null,
    email      text        not null,
    subject    text,
    message    text        not null,
    user_id    uuid        references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- Anyone may submit (insert only). No SELECT policy exists, so reads are
-- blocked for anon/authenticated; the service role (dashboard) bypasses RLS.
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename  = 'contact_messages'
          and policyname = 'anyone can submit a contact message'
    ) then
        create policy "anyone can submit a contact message"
            on contact_messages for insert
            to anon, authenticated
            with check (true);
    end if;
end $$;
