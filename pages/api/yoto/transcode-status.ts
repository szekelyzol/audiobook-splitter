// returns { transcode: { transcodedSha256?: string, transcodedInfo?: any } }
import type { NextApiRequest, NextApiResponse } from "next";
import { pollTranscode } from "../../../lib/yoto-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const { uploadId } = req.query as { uploadId?: string };
  if (!uploadId) return res.status(400).json({ error: "uploadId required" });
  const status = await pollTranscode(token, uploadId);
  res.status(200).json(status);
}
