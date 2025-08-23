import type { NextApiRequest, NextApiResponse } from "next";
import { initDeviceCode } from "../../../../lib/yoto-oauth";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try { const data = await initDeviceCode(); res.status(200).json(data); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
}