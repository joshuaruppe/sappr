import { describe, expect, it } from "vitest";
import { lintProfile } from "./logic";

const NOISY = `
# a deliberately sloppy profile
set sleeptime "1000";
set jitter "0";
set host_stage "true";
set pipename "msagent_1234";
http-get {
    set uri "/cx /image.gif";
    client { header "Host" "cdn.example.com"; }
}
http-post {
    set uri "/submit.php";
}
`;

const CLEAN = `
set sleeptime "45000";
set jitter "37";
set host_stage "false";
set useragent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0";
set pipename "prod-telemetry-a1b2";
http-get { set uri "/api/v2/status"; }
http-post { set uri "/api/v2/report"; }
https-certificate {
    set CN "cdn.contoso.example";
    set O "Contoso Ltd";
}
`;

function msgs(text: string) {
  return lintProfile(text).findings.map((f) => f.message).join(" || ");
}

describe("lintProfile", () => {
  it("is empty for blank input", () => {
    const r = lintProfile("   ");
    expect(r.findings).toEqual([]);
    expect(r.summary.sleeptime).toBeNull();
  });

  it("parses the key indicators and separates GET/POST URIs", () => {
    const r = lintProfile(NOISY);
    expect(r.summary.sleeptime).toBe(1000);
    expect(r.summary.jitter).toBe(0);
    expect(r.summary.hostStage).toBe(true);
    expect(r.summary.pipename).toBe("msagent_1234");
    expect(r.summary.getUris).toEqual(["/cx", "/image.gif"]);
    expect(r.summary.postUris).toEqual(["/submit.php"]);
  });

  it("flags every OPSEC red flag in a noisy profile", () => {
    const m = msgs(NOISY);
    expect(m).toMatch(/Low sleeptime/);
    expect(m).toMatch(/Low jitter/);
    expect(m).toMatch(/staging enabled/i);
    expect(m).toMatch(/No custom User-Agent/);
    expect(m).toMatch(/default pattern/);
  });

  it("does not skip a commented-out setting into a real one", () => {
    // A commented `set sleeptime` must not be parsed as active.
    const r = lintProfile('# set sleeptime "500";\nset sleeptime "60000";');
    expect(r.summary.sleeptime).toBe(60000);
  });

  it("stays quiet (aside from the c2lint reminder) on a well-tuned profile", () => {
    const r = lintProfile(CLEAN);
    const nonInfo = r.findings.filter((f) => f.severity !== "info");
    expect(nonInfo).toEqual([]);
    expect(r.summary.userAgent).toContain("Chrome/120.0");
    expect(r.summary.cert.O).toBe("Contoso Ltd");
  });

  it("flags the Cobalt Strike default self-signed certificate", () => {
    const m = msgs('https-certificate { set O "cobaltstrike"; set CN "Major Cobalt Strike"; }');
    expect(m).toMatch(/default self-signed/i);
  });
});
