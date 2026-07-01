/**
 * Decrypt a Group Policy Preferences `cpassword` using the AES-256 key
 * Microsoft published in [MS-GPPREF] (and deprecated in MS14-025). Because the
 * key is public, this is a pure client-side decrypt — no secret needed.
 * Async (Web Crypto). No DOM.
 */

// [MS-GPPREF] §2.2.1.1 — the fixed AES-256 key for cpassword.
const GPP_KEY = new Uint8Array([
  0x4e, 0x99, 0x06, 0xe8, 0xfc, 0xb6, 0x6c, 0xc9, 0xfa, 0xf4, 0x93, 0x10, 0x62, 0x0f, 0xfe, 0xe8,
  0xf4, 0x96, 0xe8, 0x06, 0xcc, 0x05, 0x79, 0x90, 0x20, 0x9b, 0x09, 0xa4, 0x33, 0xb6, 0x6c, 0x1b,
]);

function base64ToBytes(input: string): Uint8Array {
  let s = input.replace(/\s+/g, "");
  const mod = s.length % 4;
  if (mod === 1) throw new Error("cpassword is not valid Base64.");
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";
  let bin: string;
  try {
    bin = atob(s);
  } catch {
    throw new Error("cpassword is not valid Base64.");
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Decrypt a GPP cpassword to its plaintext. Empty input returns "". */
export async function decryptCpassword(cpassword: string): Promise<string> {
  const s = cpassword.trim();
  if (s === "") return "";

  const ct = base64ToBytes(s);
  if (ct.length === 0 || ct.length % 16 !== 0) {
    throw new Error("cpassword length is not a whole number of AES blocks.");
  }

  const key = await crypto.subtle.importKey("raw", GPP_KEY as BufferSource, { name: "AES-CBC" }, false, [
    "decrypt",
  ]);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: new Uint8Array(16) as BufferSource },
      key,
      ct as BufferSource,
    );
  } catch {
    throw new Error("Could not decrypt — this does not look like a GPP cpassword.");
  }
  // GPP stores the password as UTF-16LE.
  return new TextDecoder("utf-16le").decode(plain);
}
