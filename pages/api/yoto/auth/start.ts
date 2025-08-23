import type { NextApiRequest, NextApiResponse } from "next";
import { buildAuthorizeUrl } from "../../../../lib/yoto-oauth";
import { absoluteUrl } from "../../../../lib/url";
import { randomUUID } from "crypto";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
const redirectUri = absoluteUrl(req, process.env.YOTO_REDIRECT_PATH || "/api/yoto/auth/callback");
const state = randomUUID();
res.setHeader("Set-Cookie", `yoto_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
const url = buildAuthorizeUrl(state, undefined, redirectUri);
res.redirect(url);
}