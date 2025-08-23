import type { NextApiRequest, NextApiResponse } from "next";
import { createOrUpdateContent } from "../../../lib/yoto-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const { title, chapters, coverImageUrl } = req.body as { title: string; chapters: any[]; coverImageUrl?: string };

  const body: any = { title, content: { chapters } };
  if (coverImageUrl) body.metadata = { cover: { imageL: coverImageUrl } };

  const created = await createOrUpdateContent(token, body);
  res.status(200).json(created);
}