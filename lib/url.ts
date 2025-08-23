import type { NextApiRequest } from "next";

export function absoluteUrl(req: NextApiRequest, path = "/") {
const proto = (req.headers["x-forwarded-proto"] as string) || "https";
const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
return `${proto}://${host}${path}`;
}