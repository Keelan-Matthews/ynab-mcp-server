import type { Props } from "../types";

export function getApiKeyFromHeader(req: Request): string | null {
  // Prefer an explicit X-API-Key header so we don't trigger OAuthProvider's Bearer parsing
  const xkey = req.headers.get("x-api-key") || req.headers.get("X-API-Key") || null;
  if (xkey) return xkey.trim();
  const raw = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!raw) return null;
  const auth = raw.trim();
  return auth.replace(/^Bearer\s+/i, "");
}

export function validateApiKey(provided: string | null, env: Env): boolean {
  if (!provided) return false;
  const expected = (env as any).API_KEY;
  if (!expected) return false;
  return provided === expected;
}

export function makeServiceProps(env: Env): Props {
  return {
    login: "service",
    name: "service-account",
    email: "service@local",
    accessToken: (env as any).SERVICE_ACCESS_TOKEN || "",
    apiKey: (env as any).API_KEY,
    authorization: `Bearer ${(env as any).API_KEY}`,
  };
}
