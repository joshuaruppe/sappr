import { describe as group, expect, it } from "vitest";
import { parseInput, describe, relativeTime } from "./logic";

group("timestamp parseInput", () => {
  it("parses epoch seconds", () => {
    const date = parseInput("1700000000");
    expect(date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(date.getTime()).toBe(1_700_000_000_000);
  });

  it("auto-detects milliseconds vs seconds", () => {
    const seconds = parseInput("1700000000");
    const millis = parseInput("1700000000000");
    // Same instant whether given in seconds or milliseconds.
    expect(millis.getTime()).toBe(seconds.getTime());
    expect(millis.getTime()).toBe(1_700_000_000_000);
  });

  it("round-trips an ISO string back to the right epoch", () => {
    const date = parseInput("2023-11-14T22:13:20Z");
    expect(describe(date).epochSeconds).toBe(1_700_000_000);
    expect(describe(date).epochMillis).toBe(1_700_000_000_000);
  });

  it("parses decimal epoch seconds", () => {
    const date = parseInput("1700000000.5");
    expect(date.getTime()).toBe(1_700_000_000_500);
  });

  it("handles the epoch zero", () => {
    expect(parseInput("0").toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("throws on invalid input", () => {
    expect(() => parseInput("not a date")).toThrow();
    expect(() => parseInput("")).toThrow();
  });
});

group("timestamp describe", () => {
  it("produces all representations", () => {
    const parts = describe(parseInput("1700000000"));
    expect(parts.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(parts.utc).toBe("Tue, 14 Nov 2023 22:13:20 GMT");
    expect(parts.epochSeconds).toBe(1_700_000_000);
    expect(parts.epochMillis).toBe(1_700_000_000_000);
    expect(typeof parts.local).toBe("string");
    expect(typeof parts.rfc2822).toBe("string");
    expect(typeof parts.relative).toBe("string");
  });
});

group("timestamp relativeTime", () => {
  const now = new Date("2023-11-14T22:13:20Z");

  it("describes the past", () => {
    const past = new Date(now.getTime() - 3 * 3_600_000);
    expect(relativeTime(past, now)).toBe("3 hours ago");
  });

  it("describes the future", () => {
    const future = new Date(now.getTime() + 5 * 60_000);
    expect(relativeTime(future, now)).toBe("in 5 minutes");
  });

  it("handles the present", () => {
    expect(relativeTime(now, now)).toBe("just now");
  });

  it("uses singular units", () => {
    const past = new Date(now.getTime() - 86_400_000);
    expect(relativeTime(past, now)).toBe("1 day ago");
  });
});
