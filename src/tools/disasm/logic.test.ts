import { describe, expect, it } from "vitest";
import { disassemble, ARCHS } from "./logic";

describe("disassemble", () => {
  it("disassembles an x86-64 prologue", async () => {
    // 55 48 89 e5 48 83 ec 20 c3 → push rbp; mov rbp,rsp; sub rsp,0x20; ret
    const bytes = new Uint8Array([0x55, 0x48, 0x89, 0xe5, 0x48, 0x83, 0xec, 0x20, 0xc3]);
    const r = await disassemble(bytes, "x86-64", 0x1000);
    expect(r.error).toBe("");
    expect(r.insns[0]).toMatchObject({ address: 0x1000, mnemonic: "push", opStr: "rbp" });
    expect(r.insns.find((i) => i.mnemonic === "mov")?.opStr).toBe("rbp, rsp");
    expect(r.insns.at(-1)?.mnemonic).toBe("ret");
  });

  it("exposes the supported architectures", () => {
    expect(ARCHS.some((a) => a.id === "arm64")).toBe(true);
    expect(ARCHS.some((a) => a.id === "x86-64")).toBe(true);
  });

  it("returns empty for empty input", async () => {
    expect((await disassemble(new Uint8Array(0), "x86-64")).insns).toEqual([]);
  });
});
