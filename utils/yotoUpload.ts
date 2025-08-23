import { sha256Hex } from "./hash";

export async function uploadToYoto(file: File) {
  const sha = await sha256Hex(file);

  const init = await fetch(
    `/api/yoto/upload-init?sha256=${sha}&filename=${encodeURIComponent(file.name)}`
  ).then(r => r.json());

  const { upload } = init; // { uploadUrl, uploadId }

  // If uploadUrl exists, PUT bytes directly to the signed URL
  if (upload.uploadUrl) {
    await fetch(upload.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" }
    });
  }

  // Poll status from the browser
  let info: any | null = null;
  for (let i = 0; i < 120; i++) {
    const s = await fetch(`/api/yoto/transcode-status?uploadId=${upload.uploadId}`).then(r => r.json());
    if (s?.transcode?.transcodedSha256) { info = s.transcode; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!info) throw new Error("Transcoding timed out");
  return { sha, info }; // info.transcodedSha256, info.duration, etc.
}