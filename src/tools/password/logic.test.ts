import { describe, expect, it } from "vitest";
import {
  CHARSETS,
  AMBIGUOUS_CHARS,
  buildAlphabet,
  generatePassword,
  generatePasswords,
  estimateEntropyBits,
  strengthLabel,
} from "./logic";

describe("password generation", () => {
  it("respects the requested length", () => {
    for (const len of [4, 16, 20, 64, 128]) {
      const pwd = generatePassword({ length: len, lowercase: true });
      expect(pwd.length).toBe(len);
    }
  });

  it("only includes characters from the selected sets", () => {
    const pwd = generatePassword({ length: 200, digits: true });
    expect(/^[0-9]+$/.test(pwd)).toBe(true);

    const lower = generatePassword({ length: 200, lowercase: true });
    expect(/^[a-z]+$/.test(lower)).toBe(true);

    const mixed = generatePassword({
      length: 200,
      uppercase: true,
      digits: true,
    });
    expect(/^[A-Z0-9]+$/.test(mixed)).toBe(true);
    // Sanity: with 200 chars we should see both classes represented.
    expect(/[A-Z]/.test(mixed)).toBe(true);
    expect(/[0-9]/.test(mixed)).toBe(true);
  });

  it("excludeAmbiguous removes the ambiguous characters", () => {
    const alphabet = buildAlphabet({
      length: 1,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: true,
    });
    for (const c of AMBIGUOUS_CHARS) {
      expect(alphabet.includes(c)).toBe(false);
    }
    // Specific representatives that must be gone.
    for (const c of ["O", "0", "I", "l", "1", "|"]) {
      expect(alphabet.includes(c)).toBe(false);
    }
    // And a large generated sample never contains them.
    const pwd = generatePassword({
      length: 500,
      lowercase: true,
      uppercase: true,
      digits: true,
      excludeAmbiguous: true,
    });
    for (const c of AMBIGUOUS_CHARS) {
      expect(pwd.includes(c)).toBe(false);
    }
  });

  it("throws when no character set is enabled", () => {
    expect(() => generatePassword({ length: 10 })).toThrow();
    expect(() =>
      generatePassword({ length: 10, lowercase: false }),
    ).toThrow(/at least one/i);
  });

  it("rejects invalid lengths and counts", () => {
    expect(() => generatePassword({ length: 0, lowercase: true })).toThrow();
    expect(() => generatePassword({ length: 1.5, lowercase: true })).toThrow();
    expect(() =>
      generatePasswords({ length: 8, lowercase: true }, 0),
    ).toThrow();
  });

  it("generates the requested number of passwords", () => {
    const list = generatePasswords({ length: 12, lowercase: true }, 5);
    expect(list).toHaveLength(5);
    expect(list.every((p) => p.length === 12)).toBe(true);
  });
});

describe("entropy estimation", () => {
  it("computes length * log2(alphabetSize) for a known alphabet", () => {
    // Lowercase only => 26 symbols. 20 chars => 20 * log2(26).
    const bits = estimateEntropyBits(20, CHARSETS.lowercase.length);
    expect(bits).toBeCloseTo(20 * Math.log2(26), 10);
    expect(bits).toBeCloseTo(94.0088, 3);
  });

  it("is 64 bits for 64 binary choices", () => {
    expect(estimateEntropyBits(64, 2)).toBe(64);
  });

  it("returns 0 for degenerate inputs", () => {
    expect(estimateEntropyBits(0, 26)).toBe(0);
    expect(estimateEntropyBits(10, 1)).toBe(0);
    expect(estimateEntropyBits(10, 0)).toBe(0);
  });

  it("labels strength by bit thresholds", () => {
    expect(strengthLabel(40)).toBe("Weak");
    expect(strengthLabel(59.9)).toBe("Weak");
    expect(strengthLabel(60)).toBe("Fair");
    expect(strengthLabel(99.9)).toBe("Fair");
    expect(strengthLabel(100)).toBe("Strong");
    expect(strengthLabel(256)).toBe("Strong");
  });
});
