// Whether the Neon + Auth.js backend is configured.
//
// When false the app runs fully anonymously (local progress only): route
// protection is disabled, server actions no-op, and account pages show a
// "not connected" notice. This keeps the app usable before Neon is wired up.
//
// These env vars are server-only — this flag is meaningful on the server,
// middleware, and in server actions, not in client components.
export const isBackendConfigured =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
