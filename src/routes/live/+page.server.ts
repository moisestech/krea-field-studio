import { env } from "$env/dynamic/private";

export const load = () => ({
  liveConfigured: Boolean(env.KREA_API_KEY),
  hasDatabase: Boolean(env.DATABASE_URL),
});
