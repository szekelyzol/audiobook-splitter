import type { NextApiRequest, NextApiResponse } from "next";
import { getContent } from "../../../lib/yoto-api";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
const token = req.cookies["yoto_access"];
if (!token) return res.status(401).json({ error: "Not authenticated" });
const { cardId } = req.query as { cardId?: string };
if (!cardId) return res.status(400).json({ error: "cardId required" });
try {
const data = await getContent(token, cardId);
res.status(200).json(data);
} catch (e: any) {
res.status(500).json({ error: e?.message || String(e) });
}
}