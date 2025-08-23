import type { NextApiRequest, NextApiResponse } from "next";
import { uploadCoverImageFromUrl } from "../../../lib/yoto-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const { imageUrl } = req.body as { imageUrl: string };
  const r = await uploadCoverImageFromUrl(token, imageUrl);
  res.status(200).json(r.coverImage);
}