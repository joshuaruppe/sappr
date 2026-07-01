/**
 * Parse a Windows self-relative SECURITY_DESCRIPTOR from raw bytes into a
 * readable structure (owner/group SIDs, DACL/SACL, decoded ACEs) and render it
 * back as SDDL. Pure functions, no DOM — usable from any tool, a worker, or a test.
 *
 * Binary layout per [MS-DTYP]:
 *   2.4.6 SECURITY_DESCRIPTOR (self-relative), 2.4.5 ACL, 2.4.4 ACE, 2.4.2 SID.
 *
 * Only the self-relative form is supported (the form you get from a base64/hex
 * blob); the absolute form uses in-memory pointers and can't be parsed standalone.
 * Anything that doesn't cleanly parse returns `null` — callers treat that as
 * "these bytes are not a security descriptor".
 */

export interface ParsedSid {
  /** Canonical SID string, e.g. "S-1-5-32-544". */
  sid: string;
  /** Friendly name for well-known SIDs, e.g. "BUILTIN\\Administrators". */
  name?: string;
}

export interface ParsedAce {
  /** Symbolic ACE type, e.g. "ACCESS_ALLOWED". */
  type: string;
  typeByte: number;
  /** Symbolic inheritance/audit flags, e.g. ["CONTAINER_INHERIT", "INHERITED"]. */
  flags: string[];
  flagsByte: number;
  accessMask: number;
  /** Access mask decoded into named rights, e.g. ["GENERIC_ALL"]. */
  rights: string[];
  trustee: ParsedSid;
  /** Object-ACE GUIDs (AD), present only on object ACE types. */
  objectType?: string;
  /** Friendly name for objectType, if it's a known extended-right/property/attribute GUID. */
  objectTypeName?: string;
  inheritedObjectType?: string;
  /** Friendly name for inheritedObjectType (the object class), if known. */
  inheritedObjectTypeName?: string;
  /** This ACE rendered as an SDDL ace string, e.g. "(A;;GA;;;WD)". */
  sddl: string;
}

export interface ParsedAcl {
  revision: number;
  aces: ParsedAce[];
}

export interface SecurityDescriptor {
  revision: number;
  control: number;
  /** Symbolic control flags, e.g. ["DACL_PRESENT", "SELF_RELATIVE"]. */
  controlFlags: string[];
  owner?: ParsedSid;
  group?: ParsedSid;
  daclPresent: boolean;
  saclPresent: boolean;
  dacl?: ParsedAcl;
  sacl?: ParsedAcl;
}

// --- control flags (SECURITY_DESCRIPTOR_CONTROL) -------------------------------

const SE_DACL_PRESENT = 0x0004;
const SE_SACL_PRESENT = 0x0010;
const SE_SELF_RELATIVE = 0x8000;

const CONTROL_FLAGS: [number, string][] = [
  [0x0001, "OWNER_DEFAULTED"],
  [0x0002, "GROUP_DEFAULTED"],
  [0x0004, "DACL_PRESENT"],
  [0x0008, "DACL_DEFAULTED"],
  [0x0010, "SACL_PRESENT"],
  [0x0020, "SACL_DEFAULTED"],
  [0x0100, "DACL_AUTO_INHERIT_REQ"],
  [0x0200, "SACL_AUTO_INHERIT_REQ"],
  [0x0400, "DACL_AUTO_INHERITED"],
  [0x0800, "SACL_AUTO_INHERITED"],
  [0x1000, "DACL_PROTECTED"],
  [0x2000, "SACL_PROTECTED"],
  [0x4000, "RM_CONTROL_VALID"],
  [0x8000, "SELF_RELATIVE"],
];

// --- ACE types ----------------------------------------------------------------

const ACE_TYPES: Record<number, { name: string; sddl: string; object?: boolean }> = {
  0x00: { name: "ACCESS_ALLOWED", sddl: "A" },
  0x01: { name: "ACCESS_DENIED", sddl: "D" },
  0x02: { name: "SYSTEM_AUDIT", sddl: "AU" },
  0x03: { name: "SYSTEM_ALARM", sddl: "AL" },
  0x05: { name: "ACCESS_ALLOWED_OBJECT", sddl: "OA", object: true },
  0x06: { name: "ACCESS_DENIED_OBJECT", sddl: "OD", object: true },
  0x07: { name: "SYSTEM_AUDIT_OBJECT", sddl: "OU", object: true },
  0x09: { name: "ACCESS_ALLOWED_CALLBACK", sddl: "XA" },
  0x0a: { name: "ACCESS_DENIED_CALLBACK", sddl: "XD" },
  0x11: { name: "SYSTEM_MANDATORY_LABEL", sddl: "ML" },
  0x12: { name: "SYSTEM_RESOURCE_ATTRIBUTE", sddl: "RA" },
  0x13: { name: "SYSTEM_SCOPED_POLICY_ID", sddl: "SP" },
};

// SDDL emits ACE flags in this fixed order.
const ACE_FLAGS: { bit: number; abbr: string; name: string }[] = [
  { bit: 0x02, abbr: "CI", name: "CONTAINER_INHERIT" },
  { bit: 0x01, abbr: "OI", name: "OBJECT_INHERIT" },
  { bit: 0x04, abbr: "NP", name: "NO_PROPAGATE_INHERIT" },
  { bit: 0x08, abbr: "IO", name: "INHERIT_ONLY" },
  { bit: 0x10, abbr: "ID", name: "INHERITED" },
  { bit: 0x40, abbr: "SA", name: "SUCCESSFUL_ACCESS" },
  { bit: 0x80, abbr: "FA", name: "FAILED_ACCESS" },
];

// Access-mask bits in canonical SDDL emission order (generic, standard, DS).
const ACCESS_RIGHTS: { bit: number; abbr: string; name: string }[] = [
  { bit: 0x10000000, abbr: "GA", name: "GENERIC_ALL" },
  { bit: 0x80000000, abbr: "GR", name: "GENERIC_READ" },
  { bit: 0x40000000, abbr: "GW", name: "GENERIC_WRITE" },
  { bit: 0x20000000, abbr: "GX", name: "GENERIC_EXECUTE" },
  { bit: 0x00010000, abbr: "SD", name: "DELETE" },
  { bit: 0x00020000, abbr: "RC", name: "READ_CONTROL" },
  { bit: 0x00040000, abbr: "WD", name: "WRITE_DAC" },
  { bit: 0x00080000, abbr: "WO", name: "WRITE_OWNER" },
  { bit: 0x00100000, abbr: "", name: "SYNCHRONIZE" },
  { bit: 0x00000001, abbr: "CC", name: "DS_CREATE_CHILD" },
  { bit: 0x00000002, abbr: "DC", name: "DS_DELETE_CHILD" },
  { bit: 0x00000004, abbr: "LC", name: "DS_LIST_CHILDREN" },
  { bit: 0x00000008, abbr: "SW", name: "DS_SELF_WRITE" },
  { bit: 0x00000010, abbr: "RP", name: "DS_READ_PROP" },
  { bit: 0x00000020, abbr: "WP", name: "DS_WRITE_PROP" },
  { bit: 0x00000040, abbr: "DT", name: "DS_DELETE_TREE" },
  { bit: 0x00000080, abbr: "LO", name: "DS_LIST_OBJECT" },
  { bit: 0x00000100, abbr: "CR", name: "DS_CONTROL_ACCESS" },
];

// Common combined masks that SDDL renders as a single token.
const ACCESS_COMBOS: Record<number, string> = {
  0x1f01ff: "FA", // FILE_ALL_ACCESS
  0x120089: "FR", // FILE_GENERIC_READ
  0x120116: "FW", // FILE_GENERIC_WRITE
  0x1200a0: "FX", // FILE_GENERIC_EXECUTE
  0xf003f: "KA", // KEY_ALL_ACCESS
  0x20019: "KR", // KEY_READ (== KEY_EXECUTE)
  0x20006: "KW", // KEY_WRITE
};

// --- well-known SIDs ----------------------------------------------------------

const SID_INFO: Record<string, { alias?: string; name: string }> = {
  "S-1-0-0": { name: "NULL SID" },
  "S-1-1-0": { alias: "WD", name: "Everyone" },
  "S-1-3-0": { alias: "CO", name: "CREATOR OWNER" },
  "S-1-3-1": { alias: "CG", name: "CREATOR GROUP" },
  "S-1-5-2": { alias: "NU", name: "NT AUTHORITY\\NETWORK" },
  "S-1-5-4": { name: "NT AUTHORITY\\INTERACTIVE" },
  "S-1-5-6": { alias: "SU", name: "NT AUTHORITY\\SERVICE" },
  "S-1-5-7": { alias: "AN", name: "NT AUTHORITY\\ANONYMOUS LOGON" },
  "S-1-5-9": { alias: "ED", name: "NT AUTHORITY\\ENTERPRISE DOMAIN CONTROLLERS" },
  "S-1-5-10": { alias: "PS", name: "NT AUTHORITY\\SELF" },
  "S-1-5-11": { alias: "AU", name: "NT AUTHORITY\\Authenticated Users" },
  "S-1-5-12": { alias: "RC", name: "NT AUTHORITY\\RESTRICTED" },
  "S-1-5-18": { alias: "SY", name: "NT AUTHORITY\\SYSTEM" },
  "S-1-5-19": { alias: "LS", name: "NT AUTHORITY\\LOCAL SERVICE" },
  "S-1-5-20": { alias: "NS", name: "NT AUTHORITY\\NETWORK SERVICE" },
  "S-1-5-32-544": { alias: "BA", name: "BUILTIN\\Administrators" },
  "S-1-5-32-545": { alias: "BU", name: "BUILTIN\\Users" },
  "S-1-5-32-546": { alias: "BG", name: "BUILTIN\\Guests" },
  "S-1-5-32-547": { alias: "PU", name: "BUILTIN\\Power Users" },
  "S-1-5-32-548": { alias: "AO", name: "BUILTIN\\Account Operators" },
  "S-1-5-32-549": { alias: "SO", name: "BUILTIN\\Server Operators" },
  "S-1-5-32-550": { alias: "PO", name: "BUILTIN\\Print Operators" },
  "S-1-5-32-551": { alias: "BO", name: "BUILTIN\\Backup Operators" },
  "S-1-5-32-552": { alias: "RE", name: "BUILTIN\\Replicator" },
  "S-1-5-32-554": { alias: "RU", name: "BUILTIN\\Pre-Windows 2000 Compatible Access" },
  "S-1-5-32-555": { alias: "RD", name: "BUILTIN\\Remote Desktop Users" },
  "S-1-5-32-556": { alias: "NO", name: "BUILTIN\\Network Configuration Operators" },
  "S-1-16-0": { name: "Untrusted Mandatory Level" },
  "S-1-16-4096": { name: "Low Mandatory Level" },
  "S-1-16-8192": { name: "Medium Mandatory Level" },
  "S-1-16-12288": { name: "High Mandatory Level" },
  "S-1-16-16384": { name: "System Mandatory Level" },
};

// Domain RID-based well-knowns (S-1-5-21-<domain>-<RID>).
const DOMAIN_RIDS: Record<number, { alias: string; name: string }> = {
  500: { alias: "LA", name: "Administrator" },
  501: { alias: "LG", name: "Guest" },
  512: { alias: "DA", name: "Domain Admins" },
  513: { alias: "DU", name: "Domain Users" },
  514: { alias: "DG", name: "Domain Guests" },
  515: { alias: "DC", name: "Domain Computers" },
  516: { alias: "DD", name: "Domain Controllers" },
  518: { alias: "SA", name: "Schema Admins" },
  519: { alias: "EA", name: "Enterprise Admins" },
  520: { alias: "PA", name: "Group Policy Creator Owners" },
};

function sidInfo(sid: string): { alias?: string; name?: string } {
  const fixed = SID_INFO[sid];
  if (fixed) return fixed;
  const m = /^S-1-5-21-\d+-\d+-\d+-(\d+)$/.exec(sid);
  if (m) {
    const rid = DOMAIN_RIDS[Number(m[1])];
    if (rid) return rid;
  }
  return {};
}

/** Friendly name for a SID, or undefined if not a recognized well-known. */
export function wellKnownSidName(sid: string): string | undefined {
  return sidInfo(sid).name;
}

/** SDDL token for a SID: its 2-letter alias if well-known, else the raw SID. */
export function sddlSid(sid: string): string {
  return sidInfo(sid).alias ?? sid;
}

// Well-known AD schema GUIDs used in object ACEs: extended rights, validated
// writes, property sets, notable attributes, and object classes. Curated for
// security relevance (not exhaustive) — enough to surface the ACEs that matter
// on an engagement (DCSync, password reset, Shadow Credentials, RBCD, ...).
const GUID_NAMES: Record<string, string> = {
  // Extended rights (control-access rights)
  "1131f6aa-9c07-11d1-f79f-00c04fc2dcd2": "DS-Replication-Get-Changes",
  "1131f6ad-9c07-11d1-f79f-00c04fc2dcd2": "DS-Replication-Get-Changes-All",
  "89e95b76-444d-4c62-991a-0facbeda640c": "DS-Replication-Get-Changes-In-Filtered-Set",
  "1131f6ab-9c07-11d1-f79f-00c04fc2dcd2": "DS-Replication-Synchronize",
  "1131f6ac-9c07-11d1-f79f-00c04fc2dcd2": "DS-Replication-Manage-Topology",
  "9923a32a-3607-11d2-b9be-0000f87a36b2": "DS-Install-Replica",
  "00299570-246d-11d0-a768-00aa006e0529": "User-Force-Change-Password",
  "ab721a53-1e2f-11d0-9819-00aa0040529b": "User-Change-Password",
  "ab721a54-1e2f-11d0-9819-00aa0040529b": "Send-As",
  "ab721a56-1e2f-11d0-9819-00aa0040529b": "Receive-As",
  "ba33815a-4f93-4c76-87f3-57574bff8109": "Migrate-SID-History",
  "45ec5156-db7e-47bb-b53f-dbeb2d03c40f": "Reanimate-Tombstones",
  "e2a36dc9-ae17-47c3-b58b-be34c55ba633": "Create-Inbound-Forest-Trust",
  // Validated writes
  "bf9679c0-0de6-11d0-a285-00aa003049e2": "Self-Membership (validated write)",
  "f3a64788-5306-11d1-a9c5-0000f80367c1": "Validated-SPN (validated write)",
  "72e39547-7b18-11d1-adef-00c04fd8d5cd": "Validated-DNS-Host-Name (validated write)",
  // Property sets
  "4c164200-20c0-11d0-a768-00aa006e0529": "User-Account-Restrictions (property set)",
  "5f202010-79a5-11d0-9020-00c04fc2d4cf": "User-Logon (property set)",
  "bc0ac240-79a9-11d0-9020-00c04fc2d4cf": "Group-Membership (property set)",
  "59ba2f42-79a2-11d0-9020-00c04fc2d3cf": "General-Information (property set)",
  "77b5b886-944a-11d1-aebd-0000f80367c1": "Personal-Information (property set)",
  "e45795b2-9455-11d1-aebd-0000f80367c1": "Phone-and-Mail-Options (property set)",
  "e45795b3-9455-11d1-aebd-0000f80367c1": "Web-Information (property set)",
  "037088f8-0ae1-11d2-b422-00a0c968f939": "RAS-Information (property set)",
  // Notable attributes
  "bf9679e5-0de6-11d0-a285-00aa003049e2": "member (attribute)",
  "5b47d60f-6090-40b2-9f37-2a4de88f3063": "msDS-KeyCredentialLink (attribute)",
  "3f78c3e5-f79a-46bd-a0b8-9d18116ddc79": "msDS-AllowedToActOnBehalfOfOtherIdentity (attribute)",
  "bf967a0a-0de6-11d0-a285-00aa003049e2": "pwdLastSet (attribute)",
  "f30e3bbe-9ff0-11d1-b603-0000f80367c1": "gPLink (attribute)",
  "f30e3bbf-9ff0-11d1-b603-0000f80367c1": "gPOptions (attribute)",
  "bf967950-0de6-11d0-a285-00aa003049e2": "description (attribute)",
  // Object classes (usually inheritedObjectType)
  "bf967aba-0de6-11d0-a285-00aa003049e2": "user (class)",
  "bf967a86-0de6-11d0-a285-00aa003049e2": "computer (class)",
  "bf967a9c-0de6-11d0-a285-00aa003049e2": "group (class)",
  "bf967aa5-0de6-11d0-a285-00aa003049e2": "organizationalUnit (class)",
  "5cb41ed0-0e4c-11d0-a286-00aa003049e2": "contact (class)",
  "4828cc14-1437-45bc-9b07-ad6f015e5f28": "inetOrgPerson (class)",
  "f30e3bc2-9ff0-11d1-b603-0000f80367c1": "groupPolicyContainer (class)",
};

/** Friendly name for a well-known AD object GUID (extended right, property set, attribute, class). */
export function guidName(guid: string): string | undefined {
  return GUID_NAMES[guid.toLowerCase()];
}

/** Decode an access mask into named rights (educational, per-bit). */
export function decodeRights(mask: number): string[] {
  const out: string[] = [];
  let covered = 0;
  for (const r of ACCESS_RIGHTS) {
    if ((mask & r.bit) !== 0) {
      out.push(r.name);
      covered |= r.bit;
    }
  }
  const leftover = (mask >>> 0) & ~(covered >>> 0);
  if (leftover !== 0) out.push(`0x${(leftover >>> 0).toString(16)}`);
  return out;
}

/** Render an access mask as an SDDL rights token (combo, letters, or hex). */
export function rightsSddl(mask: number): string {
  const u = mask >>> 0;
  if (ACCESS_COMBOS[u]) return ACCESS_COMBOS[u];
  let letters = "";
  let covered = 0;
  for (const r of ACCESS_RIGHTS) {
    if (r.abbr && (mask & r.bit) !== 0) {
      letters += r.abbr;
      covered |= r.bit;
    }
  }
  if ((covered >>> 0) === u) return letters;
  return `0x${u.toString(16)}`;
}

// --- low-level binary readers -------------------------------------------------

function readSid(view: DataView, offset: number): { sid: string; length: number } {
  const revision = view.getUint8(offset);
  const subCount = view.getUint8(offset + 1);
  let authority = 0;
  for (let i = 0; i < 6; i++) authority = authority * 256 + view.getUint8(offset + 2 + i);
  let sid = `S-${revision}-${authority}`;
  for (let i = 0; i < subCount; i++) {
    sid += `-${view.getUint32(offset + 8 + i * 4, true) >>> 0}`;
  }
  return { sid, length: 8 + subCount * 4 };
}

function readGuid(view: DataView, offset: number): string {
  const hex = (n: number, w: number) => n.toString(16).padStart(w, "0");
  const d1 = hex(view.getUint32(offset, true), 8);
  const d2 = hex(view.getUint16(offset + 4, true), 4);
  const d3 = hex(view.getUint16(offset + 6, true), 4);
  let d4 = "";
  for (let i = 0; i < 2; i++) d4 += hex(view.getUint8(offset + 8 + i), 2);
  let d5 = "";
  for (let i = 0; i < 6; i++) d5 += hex(view.getUint8(offset + 10 + i), 2);
  return `${d1}-${d2}-${d3}-${d4}-${d5}`;
}

function aceFlagsNames(flags: number): string[] {
  return ACE_FLAGS.filter((f) => (flags & f.bit) !== 0).map((f) => f.name);
}

function aceFlagsSddl(flags: number): string {
  return ACE_FLAGS.filter((f) => (flags & f.bit) !== 0)
    .map((f) => f.abbr)
    .join("");
}

function makeSid(sid: string): ParsedSid {
  const name = wellKnownSidName(sid);
  return name ? { sid, name } : { sid };
}

function readAce(view: DataView, offset: number): { ace: ParsedAce; size: number } {
  const typeByte = view.getUint8(offset);
  const flagsByte = view.getUint8(offset + 1);
  const size = view.getUint16(offset + 2, true);
  const meta = ACE_TYPES[typeByte];

  let p = offset + 4;
  const accessMask = view.getUint32(p, true);
  p += 4;

  let objectType: string | undefined;
  let inheritedObjectType: string | undefined;
  if (meta?.object) {
    const objFlags = view.getUint32(p, true);
    p += 4;
    if (objFlags & 0x1) {
      objectType = readGuid(view, p);
      p += 16;
    }
    if (objFlags & 0x2) {
      inheritedObjectType = readGuid(view, p);
      p += 16;
    }
  }

  const { sid } = readSid(view, p);
  const trustee = makeSid(sid);
  const sddl = `(${meta?.sddl ?? typeByte};${aceFlagsSddl(flagsByte)};${rightsSddl(
    accessMask,
  )};${objectType ?? ""};${inheritedObjectType ?? ""};${sddlSid(sid)})`;

  return {
    ace: {
      type: meta?.name ?? `UNKNOWN_0x${typeByte.toString(16)}`,
      typeByte,
      flags: aceFlagsNames(flagsByte),
      flagsByte,
      accessMask,
      rights: decodeRights(accessMask),
      trustee,
      objectType,
      objectTypeName: objectType ? guidName(objectType) : undefined,
      inheritedObjectType,
      inheritedObjectTypeName: inheritedObjectType ? guidName(inheritedObjectType) : undefined,
      sddl,
    },
    size,
  };
}

function readAcl(view: DataView, offset: number): ParsedAcl {
  const revision = view.getUint8(offset);
  const aceCount = view.getUint16(offset + 4, true);
  const aces: ParsedAce[] = [];
  let p = offset + 8;
  for (let i = 0; i < aceCount; i++) {
    const { ace, size } = readAce(view, p);
    if (size < 4) break; // malformed; avoid a zero-length loop
    aces.push(ace);
    p += size;
  }
  return { revision, aces };
}

function controlFlagNames(control: number): string[] {
  return CONTROL_FLAGS.filter(([bit]) => (control & bit) !== 0).map(([, name]) => name);
}

/**
 * Parse `bytes` as a self-relative SECURITY_DESCRIPTOR. Returns null if the
 * bytes are not a (parseable) security descriptor, so callers can cheaply test
 * arbitrary decoded data with `parseSecurityDescriptor(bytes) !== null`.
 */
export function parseSecurityDescriptor(bytes: Uint8Array): SecurityDescriptor | null {
  try {
    if (bytes.length < 20) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const revision = view.getUint8(0);
    if (revision !== 1) return null;
    const control = view.getUint16(2, true);
    if ((control & SE_SELF_RELATIVE) === 0) return null; // only self-relative is parseable

    const offOwner = view.getUint32(4, true);
    const offGroup = view.getUint32(8, true);
    const offSacl = view.getUint32(12, true);
    const offDacl = view.getUint32(16, true);
    for (const off of [offOwner, offGroup, offSacl, offDacl]) {
      if (off !== 0 && (off < 20 || off >= bytes.length)) return null;
    }

    const daclPresent = (control & SE_DACL_PRESENT) !== 0;
    const saclPresent = (control & SE_SACL_PRESENT) !== 0;

    return {
      revision,
      control,
      controlFlags: controlFlagNames(control),
      owner: offOwner ? makeSid(readSid(view, offOwner).sid) : undefined,
      group: offGroup ? makeSid(readSid(view, offGroup).sid) : undefined,
      daclPresent,
      saclPresent,
      dacl: daclPresent && offDacl ? readAcl(view, offDacl) : undefined,
      sacl: saclPresent && offSacl ? readAcl(view, offSacl) : undefined,
    };
  } catch {
    return null; // any out-of-bounds read => "not a valid security descriptor"
  }
}

/** Render a parsed security descriptor back to its SDDL string. */
export function toSddl(sd: SecurityDescriptor): string {
  let out = "";
  if (sd.owner) out += `O:${sddlSid(sd.owner.sid)}`;
  if (sd.group) out += `G:${sddlSid(sd.group.sid)}`;
  if (sd.daclPresent) {
    let flags = "";
    if (sd.control & 0x1000) flags += "P";
    if (sd.control & 0x0400) flags += "AI";
    if (sd.control & 0x0100) flags += "AR";
    out += `D:${flags}${(sd.dacl?.aces ?? []).map((a) => a.sddl).join("")}`;
  }
  if (sd.saclPresent) {
    let flags = "";
    if (sd.control & 0x2000) flags += "P";
    if (sd.control & 0x0800) flags += "AI";
    if (sd.control & 0x0200) flags += "AR";
    out += `S:${flags}${(sd.sacl?.aces ?? []).map((a) => a.sddl).join("")}`;
  }
  return out;
}
