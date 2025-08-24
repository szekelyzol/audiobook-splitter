import type { NextApiRequest, NextApiResponse } from "next";
import { buildAuthorizeUrl } from "../../../../lib/yoto-oauth";
import { absoluteUrl } from "../../../../lib/url";
import { randomUUID } from "crypto";


export default function handler(req: NextApiRequest, res: NextApiResponse) {
const redirectUri = absoluteUrl(req, process.env.YOTO_REDIRECT_PATH || "/api/yoto/auth/callback");


// Debug helper: /api/yoto/auth/start?debug=1 → report computed redirectUri
if (req.query.debug === "1") {
res.status(200).json({ redirectUri, host: req.headers.host, xfhost: req.headers["x-forwarded-host"] });
return;
}


const state = randomUUID();
res.setHeader("Set-Cookie", `yoto_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
const url = buildAuthorizeUrl(state, undefined, redirectUri);
res.redirect(url);
}