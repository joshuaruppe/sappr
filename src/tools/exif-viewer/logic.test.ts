import { describe, expect, it } from "vitest";
import { shapeMetadata } from "./logic";

describe("shapeMetadata", () => {
  const raw = {
    Make: "Apple",
    Model: "iPhone 12",
    DateTimeOriginal: new Date("2023-05-01T12:00:00Z"),
    FNumber: 1.6,
    ISO: 100,
    latitude: 37.7749,
    longitude: -122.4194,
    Software: "16.1",
    SerialNumber: "ABC123",
    RandomTag: "hello",
  };
  const r = shapeMetadata(raw);

  it("extracts GPS coordinates and a maps link", () => {
    expect(r.gps?.lat).toBe(37.7749);
    expect(r.gps?.lon).toBe(-122.4194);
    expect(r.gps?.mapsUrl).toContain("mlat=37.7749");
  });

  it("buckets known tags and dumps the rest", () => {
    const device = r.groups.find((g) => g.title === "Device");
    expect(device?.fields.some((f) => f.key === "Make" && f.value === "Apple")).toBe(true);
    const other = r.groups.find((g) => g.title === "Other metadata");
    expect(other?.fields.some((f) => f.key === "RandomTag")).toBe(true);
  });

  it("raises GPS, serial and device findings", () => {
    expect(r.findings.some((f) => f.severity === "medium" && /GPS/.test(f.message))).toBe(true);
    expect(r.findings.some((f) => /serial number/i.test(f.message))).toBe(true);
    expect(r.findings.some((f) => /Capture device/.test(f.message))).toBe(true);
  });

  it("formats a Date tag as ISO", () => {
    const ts = r.groups.find((g) => g.title === "Timestamps");
    expect(ts?.fields.find((f) => f.key === "DateTimeOriginal")?.value).toBe(
      "2023-05-01T12:00:00.000Z",
    );
  });

  it("counts all tags", () => {
    expect(r.tagCount).toBe(Object.keys(raw).length);
  });
});
