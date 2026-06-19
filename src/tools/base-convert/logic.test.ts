import { describe, expect, it } from "vitest";
import { convertBase, toStandardBases } from "./logic";

describe("base-convert", () => {
  it("converts 255 decimal to hex/bin/oct", () => {
    expect(convertBase("255", 10, 16)).toBe("ff");
    expect(convertBase("255", 10, 2)).toBe("11111111");
    expect(convertBase("255", 10, 8)).toBe("377");
  });

  it("converts hex 'ff' to 255 decimal", () => {
    expect(convertBase("ff", 16, 10)).toBe("255");
    expect(convertBase("FF", 16, 10)).toBe("255");
  });

  it("toStandardBases returns all four bases", () => {
    expect(toStandardBases("255", 10)).toEqual({
      binary: "11111111",
      octal: "377",
      decimal: "255",
      hex: "ff",
    });
  });

  it("handles very large values (2^100) without precision loss", () => {
    const big = (2n ** 100n).toString();
    expect(convertBase(big, 10, 16)).toBe("10000000000000000000000000");
    expect(convertBase(big, 10, 2)).toBe("1" + "0".repeat(100));
    // round-trip back
    expect(convertBase("10000000000000000000000000", 16, 10)).toBe(big);
  });

  it("supports arbitrary bases 2-36", () => {
    expect(convertBase("z", 36, 10)).toBe("35");
    expect(convertBase("35", 10, 36)).toBe("z");
    expect(convertBase("zz", 36, 10)).toBe("1295");
  });

  it("handles zero and negative values", () => {
    expect(convertBase("0", 10, 16)).toBe("0");
    expect(convertBase("-255", 10, 16)).toBe("-ff");
    expect(convertBase("-ff", 16, 10)).toBe("-255");
  });

  it("throws on invalid digit for the given base", () => {
    expect(() => convertBase("2", 2, 10)).toThrow();
    expect(() => convertBase("g", 16, 10)).toThrow();
    expect(() => convertBase("xyz", 10, 16)).toThrow();
  });

  it("throws on out-of-range bases", () => {
    expect(() => convertBase("10", 1, 10)).toThrow();
    expect(() => convertBase("10", 10, 37)).toThrow();
  });
});
