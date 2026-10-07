/** Read at build time. Unset means forms render but do not submit anywhere. */
export const SIGNUP_ENDPOINT: string | undefined =
  import.meta.env.PUBLIC_SIGNUP_ENDPOINT?.trim() || undefined;
