/** Turn a pasted blob into bytes: hex (with 0x / separators), else base64/base64url,
 * else the raw Latin-1 bytes. Shared by the binary-parsing tools. */
export function bytesFromInput(input: string): Uint8Array {
  const t = input.trim();
  const hex = t.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (hex.length >= 8 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const b64 = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
