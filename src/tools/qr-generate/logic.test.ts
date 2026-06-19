import { describe, expect, it } from "vitest";
import { makeQrDataUrl, makeQrSvg } from "./logic";

describe("qr-generate", () => {
  it("makeQrSvg returns an SVG string", async () => {
    const svg = await makeQrSvg("hello");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("makeQrDataUrl returns a PNG data URL", async () => {
    const url = await makeQrDataUrl("hello");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("honors the error correction level option", async () => {
    const low = await makeQrSvg("hello", { errorCorrectionLevel: "L" });
    const high = await makeQrSvg("hello", { errorCorrectionLevel: "H" });
    expect(low).toContain("<svg");
    expect(high).toContain("<svg");
    // Higher correction encodes more modules, so the SVG path differs.
    expect(low).not.toBe(high);
  });

  it("rejects when the input is too large to encode", async () => {
    await expect(makeQrDataUrl("x".repeat(8000))).rejects.toThrow();
  });
});
