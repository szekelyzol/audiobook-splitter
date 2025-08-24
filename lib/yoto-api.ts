
const API = process.env.NEXT_PUBLIC_YOTO_API_AUDIENCE || "https://api.yotoplay.com";

export async function getUploadUrl(token: string, sha256: string, filename?: string) {
  const url = new URL(`${API}/media/transcode/audio/uploadUrl`);
  url.searchParams.set("sha256", sha256);
  if (filename) url.searchParams.set("filename", filename);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`uploadUrl failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function pollTranscode(token: string, uploadId: string, loudnorm = false) {
  const url = `${API}/media/upload/${uploadId}/transcoded?loudnorm=${String(loudnorm)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`transcode poll failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function createOrUpdateContent(token: string, body: any) {
  const res = await fetch(`${API}/content`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`content create/update failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function uploadCoverImageFromUrl(token: string, imageUrl: string, coverType = "default") {
  const url = new URL(`${API}/media/coverImage/user/me/upload`);
  url.searchParams.set("imageUrl", imageUrl);
  url.searchParams.set("autoconvert", "true");
  url.searchParams.set("coverType", coverType);
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`cover upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listPublicIcons(token: string) {
  const res = await fetch(`${API}/media/displayIcons/user/yoto`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`public icons failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getMyContent(token: string, showdeleted = false) {
const url = new URL(`${API}/content/mine`);
if (showdeleted) url.searchParams.set("showdeleted", "true");
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) throw new Error(`getMyContent failed: ${res.status} ${await res.text()}`);
return res.json();
}


export async function getContent(token: string, cardId: string) {
const res = await fetch(`${API}/content/${encodeURIComponent(cardId)}`, {
headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) throw new Error(`getContent failed: ${res.status} ${await res.text()}`);
return res.json();
}