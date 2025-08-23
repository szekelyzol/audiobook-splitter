import type { NextApiRequest, NextApiResponse } from "next";
import { pollDeviceCode } from "../../../../lib/yoto-oauth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { device_code } = req.query as { device_code?: string };
  if (!device_code) return res.status(400).json({ error: "device_code required" });
  const result = await pollDeviceCode(device_code);
  res.status(result.ok ? 200 : 403).json(result);
}