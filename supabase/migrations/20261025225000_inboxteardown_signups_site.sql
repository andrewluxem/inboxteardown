-- One signups table for more than one Teardown site. The inboxteardown-signup
-- edge function sets site from the request Origin, never from the form:
-- 'inbox' or 'page'. 'social' is allowed so Social Teardown can move here
-- later; for now it has its own socialteardown_signups table. is_preview
-- marks signups from Vercel preview deployments. It is part of the unique key
-- so a preview test never blocks, or stands in for, a real signup with the
-- same address. Existing rows are Inbox Teardown's and backfill as 'inbox'.
--
-- One ALTER, so it applies atomically. Deploy the function right after
-- applying it: the deployed version upserts on (email, list), which no longer
-- has a matching constraint, so its inserts fail until then.

alter table public.inboxteardown_signups
  add column site text not null default 'inbox'
    constraint inboxteardown_signups_site_check check (site in ('inbox', 'page', 'social')),
  add column is_preview boolean not null default false,
  drop constraint inboxteardown_signups_email_list_key,
  add constraint inboxteardown_signups_email_site_list_preview_key unique (email, site, list, is_preview);
