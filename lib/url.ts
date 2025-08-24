import type { NextApiRequest } from "next";


// Prefer a fixed origin for OAuth if provided (avoids preview host mismatches)
export function oauthBase(req: NextApiRequest) {
const override = process.env.YOTO_REDIRECT_ORIGIN;
if (override) return override.replace(/\/$/, "");
const proto = (req.headers["x-forwarded-proto"] as string) || "https";
const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
return `${proto}://${host}`;
}


export function absoluteUrl(req: NextApiRequest, path = "/") {
const base = oauthBase(req);
return `${base}${path.startsWith("/") ? path : "/" + path}`;
}