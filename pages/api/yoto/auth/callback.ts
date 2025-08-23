import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForTokens } from "../../../../lib/yoto-oauth";
import { absoluteUrl } from "../../../../lib/url";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
try {
const { code } = req.query as { code?: string };
if (!code) return res.status(400).send("Missing code");

const redirectUri = absoluteUrl(req, process.env.YOTO_REDIRECT_PATH || "/api/yoto/auth/callback");
const tokens = await exchangeCodeForTokens(code, redirectUri);

res.setHeader(
"Set-Cookie",
[
`yoto_access=${tokens.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${(tokens as any).expires_in || 3600}`,
(tokens as any).refresh_token ? `yoto_refresh=${(tokens as any).refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` : "",
].filter(Boolean)
);
res.redirect("/yoto");
} catch (e: any) {
res.status(500).send(e?.message || "Auth error");
}
}