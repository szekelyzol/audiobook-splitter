import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { getUploadUrl, pollTranscode } from "../../../lib/yoto-api";

export const config = { api: { bodyParser: { sizeLimit: "100mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { fileBase64, filename } = req.body as { fileBase64: string; filename?: string };
  const buf = Buffer.from(fileBase64, "base64");
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

  const { upload } = await getUploadUrl(token, sha256, filename);
  if (!upload.uploadUrl) {
    const poll = await pollTranscode(token, upload.uploadId);
    return res.status(200).json(poll);
  }

  const put = await fetch(upload.uploadUrl, { method: "PUT", body: buf, headers: { "Content-Type": "audio/mp4" } });
  if (!put.ok) return res.status(500).json({ error: `Upload failed: ${await put.text()}` });

  const start = Date.now();
  let info: any | null = null;
  while (Date.now() - start < 60_000) {
    const data = await pollTranscode(token, upload.uploadId);
    if (data.transcode?.transcodedSha256) { info = data.transcode; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!info) return res.status(504).json({ error: "Transcoding timed out" });
  res.status(200).json(info);
}