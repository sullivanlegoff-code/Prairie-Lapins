export interface CloudConfig {url: string; key: string; ref: string}
export const UNAVAILABLE = "La sauvegarde en ligne n'est pas disponible dans cette version. Exporte ta partie pour en garder une copie.";
export function cloudConfig(env: Record<string, unknown> = import.meta.env): CloudConfig | null {
  const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || typeof key !== 'string') return null;
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/.exec(url);
  return match && /^sb_publishable_\S+$/.test(key) ? {url, key, ref: match[1]} : null;
}
