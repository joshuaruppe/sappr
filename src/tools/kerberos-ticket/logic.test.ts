import { describe, it, expect } from "vitest";
import { parseTicketInput } from "./logic";

// Fully synthetic KRB-CRED .kirbi (fabricated, NOT a real ticket): an EXAMPLE.LOCAL
// krbtgt TGT for user jdoe, with obviously-fake session-key and cipher bytes.
const KIRBI =
  "doIBjzCCAYugAwIBBaEDAgEWooGDMIGAYX4wfKADAgEFoQ8bDUVYQU1QTEUuTE9DQUyiIjAgoAMCAQKhGTAXGwZrcmJ0Z3QbDUVYQU1QTEUuTE9DQUyjQDA+oAMCARKhAwIBAqIyBDCrq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6ujgfgwgfWgAwIBAKKB7QSB6n2B5zCB5KCB4TCB3jCB26ArMCmgAwIBEqEiBCAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH6EPGw1FWEFNUExFLkxPQ0FMohEwD6ADAgEBoQgwBhsEamRvZaMHAwUAQOAAAKQRGA8yMDI2MDEwMTEyMDAwMFqlERgPMjAyNjAxMDExMjAwMDBaphEYDzIwMjYwMTAxMjIwMDAwWqcRGA8yMDI2MDEwODEyMDAwMFqoDxsNRVhBTVBMRS5MT0NBTKkiMCCgAwIBAqEZMBcbBmtyYnRndBsNRVhBTVBMRS5MT0NBTA==";

describe("kerberos ticket tool input parsing", () => {
  it("parses a base64 .kirbi", () => {
    const r = parseTicketInput(KIRBI);
    expect(r.error).toBe("");
    expect(r.format).toBe("base64");
    expect(r.cred?.isTgt).toBe(true);
    expect(r.cred?.tickets[0].sname.name).toBe("krbtgt/EXAMPLE.LOCAL");
    expect(r.cred?.info[0].client?.name).toBe("jdoe");
  });

  it("errors on text that is not a ticket", () => {
    const r = parseTicketInput("not a ticket");
    expect(r.cred).toBeNull();
    expect(r.error).not.toBe("");
  });

  it("is blank for empty input", () => {
    expect(parseTicketInput("  ")).toEqual({ cred: null, format: null, error: "" });
  });
});
