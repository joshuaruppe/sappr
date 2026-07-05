import { describe, expect, it } from "vitest";
import { analyzeSerialized } from "./logic";

function b64(bytes: number[]): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

describe("analyzeSerialized", () => {
  it("identifies a Java serialized object and extracts strings", async () => {
    const r = await analyzeSerialized("rO0ABXQABHRlc3Q=");
    expect(r.formatId).toBe("java");
    expect(r.findings[0].severity).toBe("high");
    expect(r.strings).toContain("test");
  });

  it("identifies PHP serialize() text", async () => {
    const r = await analyzeSerialized('O:8:"stdClass":1:{s:4:"user";s:5:"admin";}');
    expect(r.formatId).toBe("php");
    expect(r.decoded).toMatch(/user/);
  });

  it("identifies ASP.NET __VIEWSTATE (FF 01)", async () => {
    const r = await analyzeSerialized(b64([0xff, 0x01, 0x00, 0x01, 0x02, 0x03]));
    expect(r.formatId).toBe("dotnet-viewstate");
    expect(r.findings[0].severity).toBe("high");
  });

  it("identifies Ruby Marshal (04 08)", async () => {
    const r = await analyzeSerialized(b64([0x04, 0x08, 0x30, 0x00]));
    expect(r.formatId).toBe("ruby");
  });

  it("identifies Python pickle (80 04)", async () => {
    const r = await analyzeSerialized(b64([0x80, 0x04, 0x95, 0x00]));
    expect(r.formatId).toBe("pickle");
    expect(r.format).toMatch(/protocol 4/);
  });

  it.skipIf(typeof CompressionStream === "undefined")(
    "identifies a JSF ViewState (gzip'd XML)",
    async () => {
      const xml = "<faces>view</faces>";
      const cs = new CompressionStream("gzip");
      const w = cs.writable.getWriter();
      void w.write(new TextEncoder().encode(xml));
      void w.close();
      const gz = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      let bin = "";
      for (const x of gz) bin += String.fromCharCode(x);
      const r = await analyzeSerialized(btoa(bin));
      expect(r.formatId).toBe("jsf");
      expect(r.decoded).toBe(xml);
    },
  );

  it("returns unknown for unrecognized bytes", async () => {
    const r = await analyzeSerialized(b64([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
    expect(r.formatId).toBe("unknown");
  });

  it("returns empty for blank input", async () => {
    expect((await analyzeSerialized("   ")).formatId).toBe(null);
  });
});
