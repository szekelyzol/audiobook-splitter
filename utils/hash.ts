// Robust browser-side SHA-256 -> hex. Compatible with older TS targets.
export async function sha256Hex(
  input: Blob | ArrayBuffer | ArrayBufferView
): Promise<string> {
  const ab = await toArrayBuffer(input);
  const digest = await crypto.subtle.digest("SHA-256", ab);

  // Manual hex encode without spread / for..of / padStart
  const u8 = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < u8.length; i++) {
    const h = u8[i].toString(16);
    hex += h.length === 1 ? "0" + h : h;
  }
  return hex;
}

async function toArrayBuffer(
  input: Blob | ArrayBuffer | ArrayBufferView
): Promise<ArrayBuffer> {
  if (input instanceof Blob) return input.arrayBuffer();
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer typing issues
    const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer;
  }
  return input as ArrayBuffer;
}
