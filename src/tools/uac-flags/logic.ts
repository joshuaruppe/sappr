/**
 * Decode a Windows/AD userAccountControl bitmask into its named flags, with
 * notes on the security-relevant ones. Pure — no DOM.
 */

const UAC_FLAGS: { bit: number; name: string; note?: string }[] = [
  { bit: 0x00000001, name: "SCRIPT" },
  { bit: 0x00000002, name: "ACCOUNTDISABLE", note: "account disabled" },
  { bit: 0x00000008, name: "HOMEDIR_REQUIRED" },
  { bit: 0x00000010, name: "LOCKOUT", note: "locked out" },
  { bit: 0x00000020, name: "PASSWD_NOTREQD", note: "password not required" },
  { bit: 0x00000040, name: "PASSWD_CANT_CHANGE" },
  { bit: 0x00000080, name: "ENCRYPTED_TEXT_PWD_ALLOWED", note: "reversible encryption" },
  { bit: 0x00000100, name: "TEMP_DUPLICATE_ACCOUNT" },
  { bit: 0x00000200, name: "NORMAL_ACCOUNT" },
  { bit: 0x00000800, name: "INTERDOMAIN_TRUST_ACCOUNT" },
  { bit: 0x00001000, name: "WORKSTATION_TRUST_ACCOUNT" },
  { bit: 0x00002000, name: "SERVER_TRUST_ACCOUNT", note: "domain controller account" },
  { bit: 0x00010000, name: "DONT_EXPIRE_PASSWORD", note: "password never expires" },
  { bit: 0x00020000, name: "MNS_LOGON_ACCOUNT" },
  { bit: 0x00040000, name: "SMARTCARD_REQUIRED" },
  { bit: 0x00080000, name: "TRUSTED_FOR_DELEGATION", note: "unconstrained delegation" },
  { bit: 0x00100000, name: "NOT_DELEGATED", note: "sensitive — cannot be delegated" },
  { bit: 0x00200000, name: "USE_DES_KEY_ONLY", note: "DES only (weak)" },
  { bit: 0x00400000, name: "DONT_REQ_PREAUTH", note: "AS-REP roastable" },
  { bit: 0x00800000, name: "PASSWORD_EXPIRED" },
  {
    bit: 0x01000000,
    name: "TRUSTED_TO_AUTH_FOR_DELEGATION",
    note: "constrained delegation with protocol transition",
  },
  { bit: 0x04000000, name: "PARTIAL_SECRETS_ACCOUNT", note: "read-only DC (RODC)" },
];

export interface UacFlag {
  bit: number;
  hex: string;
  name: string;
  note?: string;
}

export interface UacResult {
  value: number | null;
  hex: string;
  flags: UacFlag[];
  leftover: number;
  error: string;
}

/** Parse a decimal (e.g. 66048) or hex (e.g. 0x10200) UAC value into its flags. */
export function parseUac(input: string): UacResult {
  const s = input.trim();
  const empty: UacResult = { value: null, hex: "", flags: [], leftover: 0, error: "" };
  if (s === "") return empty;

  let value: number;
  if (/^0x[0-9a-fA-F]+$/.test(s)) value = parseInt(s, 16);
  else if (/^\d+$/.test(s)) value = parseInt(s, 10);
  else return { ...empty, error: "Enter a decimal (e.g. 66048) or hex (e.g. 0x10200) value." };

  if (!Number.isSafeInteger(value)) return { ...empty, error: "Value is out of range." };

  let covered = 0;
  const flags: UacFlag[] = [];
  for (const f of UAC_FLAGS) {
    if ((value & f.bit) !== 0) {
      flags.push({ bit: f.bit, hex: `0x${f.bit.toString(16)}`, name: f.name, note: f.note });
      covered |= f.bit;
    }
  }
  const leftover = (value >>> 0) & ~(covered >>> 0);
  return { value, hex: `0x${(value >>> 0).toString(16)}`, flags, leftover, error: "" };
}
