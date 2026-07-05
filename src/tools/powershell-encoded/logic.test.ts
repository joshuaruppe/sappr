import { describe, expect, it } from "vitest";
import { extractBase64, decodeOuter, decodePowerShell, encodeToBase64 } from "./logic";

describe("decodePowerShell resilience", () => {
  it("does not raise a decode error for a long non-base64 word", async () => {
    const r = await decodePowerShell("thisisareallylongwordwithnospaces");
    expect(r.error).toBe("");
  });
});

describe("extractBase64", () => {
  it("pulls the base64 out of a `powershell -enc` line", () => {
    expect(extractBase64("powershell.exe -enc dwBoAG8AYQBtAGkA")).toBe("dwBoAG8AYQBtAGkA");
  });

  it("returns the longest base64 run", () => {
    expect(extractBase64("short AAAA and dwBoAG8AYQBtAGkAdwBoAG8A here")).toBe(
      "dwBoAG8AYQBtAGkAdwBoAG8A",
    );
  });
});

describe("decodeOuter", () => {
  it("decodes UTF-16LE (the PowerShell default)", () => {
    const r = decodeOuter("dwBoAG8AYQBtAGkA");
    expect(r.encoding).toBe("UTF-16LE");
    expect(r.text).toBe("whoami");
  });

  it("honors a forced UTF-16LE encoding", () => {
    const r = decodeOuter("dwBoAG8AYQBtAGkA", "utf-16le");
    expect(r.encoding).toBe("UTF-16LE");
    expect(r.text).toBe("whoami");
  });

  it("honors a forced UTF-8 encoding even on UTF-16LE bytes", () => {
    const r = decodeOuter("dwBoAG8AYQBtAGkA", "utf-8");
    expect(r.encoding).toBe("UTF-8");
    expect(r.text).not.toBe("whoami");
  });

  it("falls back to UTF-8 when the bytes are not UTF-16LE", () => {
    const b64 = btoa("this is plain ascii text");
    const r = decodeOuter(b64);
    expect(r.encoding).toBe("UTF-8");
    expect(r.text).toBe("this is plain ascii text");
  });
});

describe("decodePowerShell", () => {
  it("decodes a -EncodedCommand to a single layer", async () => {
    const r = await decodePowerShell("powershell -enc dwBoAG8AYQBtAGkA");
    expect(r.layers).toHaveLength(1);
    expect(r.layers[0].text).toBe("whoami");
    expect(r.layers[0].label).toMatch(/UTF-16LE/);
  });

  it("returns empty for blank input", async () => {
    const r = await decodePowerShell("   ");
    expect(r.layers).toHaveLength(0);
    expect(r.error).toBe("");
  });

  it.skipIf(typeof CompressionStream === "undefined")(
    "unwraps an inner Base64 + Gzip payload",
    async () => {
      // Build a fixture: gzip a payload, embed it as an inner FromBase64String.
      const payload = "Invoke-SecretPayload; IEX";
      const cs = new CompressionStream("gzip");
      const writer = cs.writable.getWriter();
      void writer.write(new TextEncoder().encode(payload));
      void writer.close();
      const gzBytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      let bin = "";
      for (const b of gzBytes) bin += String.fromCharCode(b);
      const innerB64 = btoa(bin);
      const script = `[IO.Compression.GzipStream]; [Convert]::FromBase64String('${innerB64}')`;
      const outerB64 = btoa(script);

      const r = await decodePowerShell(outerB64);
      expect(r.layers).toHaveLength(2);
      expect(r.layers[1].text).toBe(payload);
      expect(r.layers[1].label).toMatch(/Gunzip/);
    },
  );
});

describe("encodeToBase64", () => {
  it("encodes to Base64 of UTF-16LE (matches PowerShell -enc)", () => {
    expect(encodeToBase64("whoami")).toBe("dwBoAG8AYQBtAGkA");
  });

  it("round-trips with decodeOuter", () => {
    const script = `$x = 1\nWrite-Host "hi $x"\nGet-Date`;
    expect(decodeOuter(encodeToBase64(script)).text).toBe(script);
  });

  it("returns empty for empty input", () => {
    expect(encodeToBase64("")).toBe("");
  });
});
