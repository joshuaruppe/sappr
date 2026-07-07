import { describe, expect, it } from "vitest";
import { parseLnk, bytesFromInput } from "./logic";

/** Build a minimal but valid .lnk: header + Name/Arguments StringData (unicode)
 * + a TrackerDataBlock carrying a NetBIOS name and a v1-UUID droid (→ MAC). */
function buildLnk(): Uint8Array {
  const buf = new Uint8Array(220);
  const v = new DataView(buf.buffer);
  v.setUint32(0, 0x4c, true); // HeaderSize
  buf.set(
    [0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
    4,
  ); // LinkCLSID
  v.setUint32(20, 0x04 | 0x20 | 0x80, true); // HasName | HasArguments | IsUnicode
  v.setUint32(60, 1, true); // ShowCommand = SW_SHOWNORMAL

  const putStr = (off: number, s: string): number => {
    v.setUint16(off, s.length, true);
    let o = off + 2;
    for (const ch of s) {
      v.setUint16(o, ch.charCodeAt(0), true);
      o += 2;
    }
    return o;
  };
  let off = putStr(76, "Malicious"); // → 96
  off = putStr(off, "-enc SQBFAFgA"); // → 124

  // TrackerDataBlock @124
  v.setUint32(124, 0x60, true); // BlockSize
  v.setUint32(128, 0xa0000003, true); // TrackerDataBlock signature
  v.setUint32(132, 0x58, true); // Length
  v.setUint32(136, 0, true); // Version
  const mid = "DESKTOP-ABC";
  for (let i = 0; i < mid.length; i++) buf[140 + i] = mid.charCodeAt(i); // MachineID
  for (let i = 0; i < 16; i++) buf[156 + i] = 0xaa; // Droid volume GUID
  for (let i = 0; i < 16; i++) buf[172 + i] = 0xaa; // Droid file GUID
  buf[172 + 7] = 0x11; // version nibble = 1 (v1 UUID)
  buf.set([0x00, 0x11, 0x22, 0x33, 0x44, 0x55], 172 + 10); // node = MAC
  return buf;
}

describe("parseLnk", () => {
  const r = parseLnk(buildLnk());

  it("parses header flags and string data", () => {
    expect(r.error).toBe("");
    expect(r.flags).toEqual(expect.arrayContaining(["HasName", "HasArguments", "IsUnicode"]));
    expect(r.name).toBe("Malicious");
    expect(r.arguments).toBe("-enc SQBFAFgA");
    expect(r.showCommand).toBe("SW_SHOWNORMAL");
  });

  it("recovers origin attribution from the tracker block", () => {
    expect(r.extraBlocks).toContain("TrackerDataBlock");
    expect(r.tracker?.machineId).toBe("DESKTOP-ABC");
    expect(r.tracker?.macAddress).toBe("00:11:22:33:44:55");
  });

  it("flags encoded PowerShell in the arguments", () => {
    expect(r.findings.some((f) => f.severity === "high" && /PowerShell/i.test(f.message))).toBe(true);
    expect(r.findings.some((f) => f.severity === "info" && /attribution/i.test(f.message))).toBe(true);
  });

  it("rejects a non-.lnk (bad header size)", () => {
    expect(parseLnk(new Uint8Array(80)).error).toMatch(/HeaderSize/);
  });

  it("rejects input that is too small", () => {
    expect(parseLnk(new Uint8Array(10)).error).toMatch(/Too small/);
  });
});

describe("bytesFromInput", () => {
  it("decodes hex", () => {
    expect(Array.from(bytesFromInput("4c 00 00 00"))).toEqual([0x4c, 0, 0, 0]);
  });

  it("round-trips a base64 blob", () => {
    const lnk = buildLnk();
    let bin = "";
    for (const b of lnk) bin += String.fromCharCode(b);
    expect(Array.from(bytesFromInput(btoa(bin)))).toEqual(Array.from(lnk));
  });
});
