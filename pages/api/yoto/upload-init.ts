// returns { upload: { uploadUrl: string|null, uploadId: string } }
import type { NextApiRequest, NextApiResponse } from "next";
import { getUploadUrl } from "../../../lib/yoto-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const { sha256, filename } = req.query as { sha256?: string; filename?: string };
  if (!sha256) return res.status(400).json({ error: "sha256 required" });
  const data = await getUploadUrl(token, sha256, filename);
  res.status(200).json(data);
}
