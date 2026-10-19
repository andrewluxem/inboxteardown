-- Allow the Black Friday tracker's alert list ('bfcm') next to the newsletter
-- and the Watchlist waitlist. Apply before deploying the edge function that
-- accepts list=bfcm, or those inserts fail the check and the visitor lands
-- on /signed-up/?signup=error.

alter table public.inboxteardown_signups
  drop constraint inboxteardown_signups_list_check,
  add constraint inboxteardown_signups_list_check check (list in ('newsletter', 'watchlist', 'bfcm'));
