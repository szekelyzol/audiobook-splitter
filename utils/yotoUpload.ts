import { sha256Hex } from "./hash";

export async function uploadToYoto(file: File) {
  const sha = await sha256Hex(file);

  const init = await fetch(
    `/api/yoto/upload-init?sha256=${sha}&filename=${encodeURIComponent(file.name)}`
  ).then(r => r.json());

  const { upload } = init as { upload: { uploadUrl: string | null; uploadId: string } };

  // Direct PUT to the signed URL (if Yoto doesn't already have this sha)
  if (upload.uploadUrl) {
    await fetch(upload.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" }
    });
  }

  // Poll for transcode readiness (loudnorm=false recommended in docs)
  let transcoded: any | null = null;
  for (let i = 0; i < 120; i++) {
    const s = await fetch(`/api/yoto/transcode-status?uploadId=${upload.uploadId}&loudnorm=false`)
      .then(r => r.json());
    if (s?.transcode?.transcodedSha256) { transcoded = s.transcode; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!transcoded) throw new Error("Transcoding timed out");

  return { sha, transcoded };
}
