// The signup endpoint for the Teardown sites' forms; the logic is in
// handler.ts. Kept under its original name so Inbox Teardown's
// PUBLIC_SIGNUP_ENDPOINT does not change.
//
// Deployed with --no-verify-jwt: the forms have no Supabase key to send.

import { createHandler } from './handler.ts';

Deno.serve(
  createHandler({
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  }),
);
