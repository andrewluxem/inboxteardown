-- Signups from the site's newsletter and Watchlist forms. Written only by the
-- inboxteardown-signup edge function with the service role; anon and
-- authenticated get no access, and RLS has no policies.
--
-- email is text kept lowercase rather than citext: citext is not installed on
-- this shared project, and this migration creates only inboxteardown objects.
-- The check plus the unique constraint give the same case-insensitive dedupe.

create table public.inboxteardown_signups (
  id bigint generated always as identity primary key,
  email text not null
    constraint inboxteardown_signups_email_lower check (email = lower(email))
    constraint inboxteardown_signups_email_length check (char_length(email) between 3 and 254),
  list text not null
    constraint inboxteardown_signups_list_check check (list in ('newsletter', 'watchlist')),
  source_page text,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint inboxteardown_signups_email_list_key unique (email, list)
);

alter table public.inboxteardown_signups enable row level security;

revoke all on table public.inboxteardown_signups from anon, authenticated;
revoke all on sequence public.inboxteardown_signups_id_seq from anon, authenticated;
