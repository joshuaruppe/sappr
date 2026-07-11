import { describe, expect, it } from "vitest";
import { timestampedName, formatBytes } from "./utils";

describe("timestampedName", () => {
  it("inserts a YYYYMMDD-HHMMSS stamp before the extension", () => {
    expect(timestampedName("cidrs.txt")).toMatch(/^cidrs_\d{8}-\d{6}\.txt$/);
    expect(timestampedName("mac-vendors.tsv")).toMatch(/^mac-vendors_\d{8}-\d{6}\.tsv$/);
    expect(timestampedName("qr.png")).toMatch(/^qr_\d{8}-\d{6}\.png$/);
  });

  it("appends the stamp when there is no extension", () => {
    expect(timestampedName("hosts")).toMatch(/^hosts_\d{8}-\d{6}$/);
  });

  it("only splits on the final dot", () => {
    expect(timestampedName("scan.results.txt")).toMatch(/^scan\.results_\d{8}-\d{6}\.txt$/);
  });
});

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
