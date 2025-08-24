import type { NextApiRequest, NextApiResponse } from "next";

// Transparent proxy to Yoto's /content endpoint.
// - Create new playlist: omit cardId in body
// - Update existing playlist: include cardId in body
// Returns upstream status + JSON body verbatim so the client can see exact errors.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const upstream = await fetch("https://api.yotoplay.com/content", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();

    // Always reply with JSON so the client can safely .json() or read text for debugging
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");

    // If upstream returned an empty body, send a minimal JSON object
    if (!text) {
      return res.send(JSON.stringify({ ok: upstream.ok }));
    }

    return res.send(text);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
