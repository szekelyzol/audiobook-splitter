import type { NextApiRequest, NextApiResponse } from "next";

// minimal pass-through to Yoto /content with better error handling:
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.cookies["yoto_access"];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const y = await fetch("https://api.yotoplay.com/content", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const txt = await y.text();
    if (!y.ok) {
      // Surface Yoto’s error body verbatim to the client as JSON
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch {}
      return res.status(y.status).json(parsed || { error: txt || "Server error" });
    }

    // Success → send their JSON straight back
    return res.status(200).json(JSON.parse(txt));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
