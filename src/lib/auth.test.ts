import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  unlockExpiry,
  isPasswordValid,
  passwordIssues,
  MIN_PASSWORD_LENGTH,
  LOCK_INTERVALS,
} from "./auth";

describe("auth password hashing", () => {
  it("produces an Argon2id PHC string", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$/);
  }, 15_000);

  it("verifies the correct password", async () => {
    const h = await hashPassword("s3cr3t-pass");
    expect(await verifyPassword("s3cr3t-pass", h)).toBe(true);
  }, 15_000);

  it("rejects a wrong password", async () => {
    const h = await hashPassword("s3cr3t-pass");
    expect(await verifyPassword("nope", h)).toBe(false);
  }, 15_000);

  it("uses a random salt: the same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  }, 20_000);

  it("returns false (does not throw) on a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "not-a-real-phc-hash")).toBe(false);
  });
});

describe("auth unlock cadence", () => {
  it("launch mode is session-scoped (no expiry timestamp)", () => {
    expect(unlockExpiry("launch", 1_000)).toBe(0);
  });

  it("daily mode expires 24h out", () => {
    expect(unlockExpiry("daily", 0)).toBe(86_400_000);
  });

  it("weekly mode expires 7d out", () => {
    expect(unlockExpiry("weekly", 0)).toBe(604_800_000);
  });

  it("exposes a sane minimum length and the three cadences", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(LOCK_INTERVALS.map((i) => i.value)).toEqual([
      "launch",
      "daily",
      "weekly",
    ]);
  });
});

describe("auth password policy", () => {
  it("accepts a password meeting every rule", () => {
    expect(isPasswordValid("Sappr!2026rocks")).toBe(true);
    expect(passwordIssues("Sappr!2026rocks")).toEqual([]);
  });

  it("flags a too-short password", () => {
    expect(isPasswordValid("Aa1!xyz")).toBe(false);
    expect(passwordIssues("Aa1!xyz")).toContain(
      `At least ${MIN_PASSWORD_LENGTH} characters`,
    );
  });

  it("requires an uppercase letter", () => {
    expect(isPasswordValid("lowercase1!long")).toBe(false);
    expect(passwordIssues("lowercase1!long")).toContain("An uppercase letter");
  });

  it("requires a number", () => {
    expect(isPasswordValid("NoNumbersHere!!")).toBe(false);
    expect(passwordIssues("NoNumbersHere!!")).toContain("A number");
  });

  it("requires a special character", () => {
    expect(isPasswordValid("NoSpecials12345")).toBe(false);
    expect(passwordIssues("NoSpecials12345")).toContain("A special character");
  });

  it("reports every unmet rule at once for a weak password", () => {
    expect(passwordIssues("abc")).toEqual([
      `At least ${MIN_PASSWORD_LENGTH} characters`,
      "An uppercase letter",
      "A number",
      "A special character",
    ]);
  });
});
