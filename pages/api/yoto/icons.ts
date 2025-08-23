import type { NextApiRequest, NextApiResponse } from "next";
import { listPublicIcons } from "../../../lib/yoto-api";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const token = _req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const data = await listPublicIcons(token);
  res.status(200).json(data);
}