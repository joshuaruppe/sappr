import { describe, expect, it } from "vitest";
import { lookupError, countCodes, type ErrorData } from "./logic";

const data: ErrorData = {
  ntstatus: {
    "0xc0000022": [{ name: "STATUS_ACCESS_DENIED", desc: "A process has requested access to an object." }],
  },
  win32: {
    "2": [{ name: "ERROR_FILE_NOT_FOUND", desc: "The system cannot find the file specified." }],
    "5": [{ name: "ERROR_ACCESS_DENIED", desc: "Access is denied." }],
  },
  hresult: {
    "0x80070005": [{ name: "E_ACCESSDENIED", desc: "General access denied error" }],
  },
};

describe("lookupError", () => {
  it("decodes an NTSTATUS from hex", () => {
    const nt = lookupError("0xC0000022", data).interpretations.find((i) => i.family === "NTSTATUS");
    expect(nt?.names).toContain("STATUS_ACCESS_DENIED");
  });

  it("accepts a signed negative NTSTATUS decimal", () => {
    const r = lookupError("-1073741790", data);
    expect(r.hex).toBe("0xC0000022");
    expect(r.interpretations.some((i) => i.names.includes("STATUS_ACCESS_DENIED"))).toBe(true);
  });

  it("decodes a Win32 error by decimal", () => {
    const w = lookupError("2", data).interpretations.find((i) => i.family === "Win32");
    expect(w?.names).toContain("ERROR_FILE_NOT_FOUND");
  });

  it("decodes an HRESULT and unwraps FACILITY_WIN32", () => {
    const r = lookupError("0x80070005", data);
    expect(r.interpretations.some((i) => i.names.includes("E_ACCESSDENIED"))).toBe(true);
    const wrap = r.interpretations.find((i) => i.note === "FACILITY_WIN32");
    expect(wrap?.description).toMatch(/ERROR_ACCESS_DENIED/);
    expect(r.hresultStructure?.facility).toBe("FACILITY_WIN32");
    expect(r.hresultStructure?.severity).toBe("Failure");
  });

  it("falls back to hex when a bare code matches nothing as decimal", () => {
    expect(
      lookupError("80070005", data).interpretations.some((i) => i.names.includes("E_ACCESSDENIED")),
    ).toBe(true);
  });

  it("errors on non-numeric junk", () => {
    expect(lookupError("hello world!!", data).error).not.toBe("");
  });

  it("suggests a near match for a mistyped hex code (dropped digit)", () => {
    const r = lookupError("0x8007005", data); // meant 0x80070005
    expect(r.unrecognized).toBe(true);
    expect(r.suggestions?.some((s) => s.name === "E_ACCESSDENIED")).toBe(true);
  });

  it("suggests for an unparseable near-miss (O typed for 0)", () => {
    const r = lookupError("0xC0000O22", data); // O instead of 0 → 0xC0000022
    expect(r.suggestions?.some((s) => s.name === "STATUS_ACCESS_DENIED")).toBe(true);
  });

  it("hides the HRESULT structure for an NTSTATUS match", () => {
    expect(lookupError("0xC0000022", data).hresultStructure).toBeUndefined();
  });

  it("hides the HRESULT structure for a Win32 decimal", () => {
    expect(lookupError("2", data).hresultStructure).toBeUndefined();
  });

  it("decodes the NTSTATUS structure for an NTSTATUS value", () => {
    const nt = lookupError("0xC0000022", data).ntstatusStructure;
    expect(nt?.severity).toBe("Error");
    expect(nt?.facility).toBe("FACILITY_NULL");
    expect(nt?.code).toBe(0x22);
  });

  it("does not attach an NTSTATUS structure to an HRESULT value", () => {
    expect(lookupError("0x80070005", data).ntstatusStructure).toBeUndefined();
  });

  it("hides the HRESULT structure for a non-HRESULT-shaped unknown value", () => {
    expect(lookupError("0x8007005", data).hresultStructure).toBeUndefined();
  });

  it("nudges to double-check an unrecognized but valid value", () => {
    const r = lookupError("0xDEADBEEF", data);
    expect(r.unrecognized).toBe(true);
    expect(r.interpretations).toEqual([]);
    expect(r.suggestions).toEqual([]);
  });

  it("is blank for empty input", () => {
    expect(lookupError("  ", data)).toEqual({ interpretations: [], error: "" });
  });

  it("counts every indexed code across the three families", () => {
    // 1 NTSTATUS + 2 Win32 + 1 HRESULT
    expect(countCodes(data)).toBe(4);
  });
});
