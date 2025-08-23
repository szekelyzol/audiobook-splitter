
export const YOTO_AUTH_DOMAIN = process.env.NEXT_PUBLIC_YOTO_AUTH_DOMAIN || "https://login.yotoplay.com";
export const YOTO_API_AUDIENCE = process.env.NEXT_PUBLIC_YOTO_API_AUDIENCE || "https://api.yotoplay.com";
export const YOTO_SCOPES = process.env.NEXT_PUBLIC_YOTO_SCOPES || "openid profile offline_access";
export const YOTO_CLIENT_ID = process.env.NEXT_PUBLIC_YOTO_CLIENT_ID!;
export const YOTO_CLIENT_SECRET = process.env.YOTO_CLIENT_SECRET;

export function getRedirectUri(baseUrl = process.env.NEXT_PUBLIC_BASE_URL) {
  const path = process.env.YOTO_REDIRECT_PATH || "/api/yoto/auth/callback";
  return `${baseUrl?.replace(/\/$/, "")}${path}`;
}

export function buildAuthorizeUrl(state: string, codeChallenge?: string) {
  const params = new URLSearchParams({
    audience: YOTO_API_AUDIENCE,
    scope: YOTO_SCOPES,
    response_type: "code",
    client_id: YOTO_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    state,
  });
  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${YOTO_AUTH_DOMAIN}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: YOTO_CLIENT_ID,
    client_secret: YOTO_CLIENT_SECRET || "",
    code,
    redirect_uri: getRedirectUri(),
  });
  const res = await fetch(`${YOTO_AUTH_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function initDeviceCode() {
  const body = new URLSearchParams({
    client_id: YOTO_CLIENT_ID,
    scope: `${YOTO_SCOPES}`,
    audience: YOTO_API_AUDIENCE,
  });
  const res = await fetch(`${YOTO_AUTH_DOMAIN}/oauth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Device code init failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function pollDeviceCode(device_code: string) {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code,
    client_id: YOTO_CLIENT_ID,
    audience: YOTO_API_AUDIENCE,
  });
  const res = await fetch(`${YOTO_AUTH_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: json };
  }
  return { ok: true as const, tokens: json };
}