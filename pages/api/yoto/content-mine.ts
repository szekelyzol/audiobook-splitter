import type { NextApiRequest, NextApiResponse } from "next";
import { getMyContent } from "../../../lib/yoto-api";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
const token = req.cookies["yoto_access"];
if (!token) return res.status(401).json({ error: "Not authenticated" });
try {
const showdeleted = req.query.showdeleted === "true";
const data = await getMyContent(token, showdeleted);
res.status(200).json(data);
} catch (e: any) {
res.status(500).json({ error: e?.message || String(e) });
}
}