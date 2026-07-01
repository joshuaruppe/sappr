import { describe, it, expect } from "vitest";
import { parseSdInput } from "./logic";

// Same descriptor as the lib test (O:SYG:SYD:(A;;GA;;;WD)), in both encodings.
const SD_B64 =
  "AQAEgBQAAAAgAAAAAAAAACwAAAABAQAAAAAABRIAAAABAQAAAAAABRIAAAACABwAAQAAAAAAFAAAAAAQAQEAAAAAAAEAAAAA";
const SD_HEX =
  "010004801400000020000000000000002c00000001010000000000051200000001010000000000051200000002001c00010000000000140000000010010100000000000100000000";

describe("security descriptor tool input parsing", () => {
  it("parses a Base64 descriptor", () => {
    const r = parseSdInput(SD_B64);
    expect(r.error).toBe("");
    expect(r.format).toBe("base64");
    expect(r.sd?.owner?.sid).toBe("S-1-5-18");
    expect(r.sd?.dacl?.aces[0].trustee.sid).toBe("S-1-1-0");
  });

  it("parses a hex descriptor (with separators)", () => {
    const r = parseSdInput("01:00:04:80 14 00 00 00" + SD_HEX.slice(16));
    expect(r.format).toBe("hex");
    expect(r.sd?.owner?.sid).toBe("S-1-5-18");
  });

  it("errors on text that is not a descriptor", () => {
    const r = parseSdInput("definitely not an SD");
    expect(r.sd).toBeNull();
    expect(r.error).not.toBe("");
  });

  it("is blank (no error) for empty input", () => {
    expect(parseSdInput("   ")).toEqual({ sd: null, format: null, error: "" });
  });
});
