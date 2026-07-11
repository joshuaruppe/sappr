import { describe, expect, it } from "vitest";
import { parseProfile, parseUriList, generateRedirector } from "./logic";

const PROFILE = `
http-get {
    set uri "/api/v1/updates /jquery-3.3.1.min.js";
    client { header "Host" "cdn.example.com"; }
}
http-post {
    set uri "/submit.php";
}
set useragent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
`;

describe("parseProfile", () => {
  it("pulls every URI (get + post) and the User-Agent from a malleable profile", () => {
    const r = parseProfile(PROFILE);
    expect(r.uris).toEqual(["/api/v1/updates", "/jquery-3.3.1.min.js", "/submit.php"]);
    expect(r.userAgent).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
  });

  it("also picks up stager uri_x86 / uri_x64 and dedupes", () => {
    const r = parseProfile(
      'http-stager { set uri_x86 "/a"; set uri_x64 "/a /b"; }',
    );
    expect(r.uris).toEqual(["/a", "/b"]);
    expect(r.userAgent).toBe("");
  });
});

describe("parseUriList", () => {
  it("splits on whitespace/commas and prefixes a missing slash", () => {
    expect(parseUriList("/a\nb, /c  /a")).toEqual(["/a", "/b", "/c"]);
  });
});

describe("generateRedirector", () => {
  const base = {
    uris: ["/api/v1/updates", "/submit.php"],
    userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    teamServer: "https://10.0.0.5:8443",
    decoy: "https://www.legit-decoy.com",
    blockScanners: true,
  };

  it("errors when there are no URIs", () => {
    expect(generateRedirector({ ...base, uris: [] }).error).toMatch(/No URIs/);
  });

  it("errors when the team server is missing", () => {
    expect(generateRedirector({ ...base, teamServer: "  " }).error).toMatch(/team server/i);
  });

  it("emits an nginx block that matches the URIs, checks the UA and proxies", () => {
    const r = generateRedirector(base);
    expect(r.error).toBe("");
    // URIs are regex-escaped and grouped in a location match.
    expect(r.nginx).toContain("location ~ ^(/api/v1/updates|/submit\\.php)$");
    expect(r.nginx).toContain('if ($http_user_agent != "Mozilla/5.0 (Windows NT 10.0)")');
    expect(r.nginx).toContain("proxy_pass https://10.0.0.5:8443;");
    expect(r.nginx).toContain("return 302 https://www.legit-decoy.com;");
  });

  it("emits an Apache mod_rewrite block with a proxying rule and a decoy fallback", () => {
    const r = generateRedirector(base);
    expect(r.apache).toContain("RewriteCond %{REQUEST_URI} ^(/api/v1/updates|/submit\\.php)$");
    // The UA is regex-escaped for Apache (parens escaped).
    expect(r.apache).toContain('RewriteCond %{HTTP_USER_AGENT} "^Mozilla/5\\.0 \\(Windows NT 10\\.0\\)$"');
    expect(r.apache).toContain("RewriteRule ^.*$ https://10.0.0.5:8443%{REQUEST_URI} [P,L]");
    expect(r.apache).toContain("RewriteRule ^.*$ https://www.legit-decoy.com [R=302,L]");
  });

  it("includes the scanner blocklist only when enabled", () => {
    expect(generateRedirector(base).nginx).toContain("python-requests");
    expect(generateRedirector({ ...base, blockScanners: false }).nginx).not.toContain("python-requests");
  });

  it("skips the UA check and warns when no User-Agent is given", () => {
    const r = generateRedirector({ ...base, userAgent: "" });
    expect(r.nginx).not.toContain("$http_user_agent !=");
    expect(r.warnings.some((w) => /User-Agent/i.test(w))).toBe(true);
  });

  it("defaults a missing decoy and warns", () => {
    const r = generateRedirector({ ...base, decoy: "" });
    expect(r.nginx).toContain("https://www.example.com");
    expect(r.warnings.some((w) => /decoy/i.test(w))).toBe(true);
  });
});
