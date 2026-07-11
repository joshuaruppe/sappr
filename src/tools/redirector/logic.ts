/**
 * Generate C2 redirector configs for nginx and Apache (mod_rewrite). A redirector
 * is a reverse proxy in front of a team server: it forwards only the HTTP traffic
 * that matches a malleable C2 profile (the right URIs and User-Agent) and sends
 * everything else (scanners, sandboxes, curious analysts) to a decoy site. This is
 * pure web infrastructure: parse a profile (or take manual fields) and emit the
 * matching proxy/rewrite rules. Entirely client-side, so the profile and team
 * server address never leave the browser (the whole point of not using an online
 * converter for this).
 */

export interface RedirectorInput {
  /** Beacon URIs to match, each a path like "/api/v1/updates". */
  uris: string[];
  /** Exact User-Agent to require, or "" to match on URI alone. */
  userAgent: string;
  /** Full URL of the team server to proxy valid traffic to. */
  teamServer: string;
  /** Where non-matching traffic is redirected (a believable decoy site). */
  decoy: string;
  /** Also drop common scanner/sandbox User-Agents to the decoy. */
  blockScanners: boolean;
}

export interface RedirectorResult {
  nginx: string;
  apache: string;
  warnings: string[];
  error: string;
}

/** Common scanner / sandbox / library User-Agents to sink to the decoy. */
const SCANNER_UAS = [
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "Go-http-client",
  "libwww-perl",
  "masscan",
  "nmap",
  "zgrab",
  "Nikto",
  "sqlmap",
  "WPScan",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pull the beacon URIs and User-Agent out of a Cobalt Strike malleable profile. */
export function parseProfile(text: string): { uris: string[]; userAgent: string } {
  const uris: string[] = [];
  const seen = new Set<string>();
  // set uri / set uri_x86 / set uri_x64 "..."; the value may hold several URIs.
  const uriRe = /set\s+uri(?:_x86|_x64)?\s+"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = uriRe.exec(text))) {
    for (const part of m[1].split(/\s+/)) {
      const u = part.trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        uris.push(u);
      }
    }
  }
  const uaM = /set\s+useragent\s+"([^"]+)"/i.exec(text);
  return { uris, userAgent: uaM ? uaM[1].trim() : "" };
}

/** Normalize a freeform list of URIs (newline / space / comma separated). */
export function parseUriList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,]+/)) {
    const t = raw.trim();
    if (!t) continue;
    const u = t.startsWith("/") ? t : "/" + t;
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function buildNginx(inp: RedirectorInput): string {
  const uriGroup = inp.uris.map(escapeRegex).join("|");
  const L: string[] = [
    "# nginx C2 redirector. Matching beacon traffic is proxied to the team server;",
    "# everything else is redirected to the decoy. Set server_name and the TLS paths.",
    "server {",
    "    listen 443 ssl;",
    "    server_name REDIRECTOR_DOMAIN;",
    "",
    "    ssl_certificate     /etc/letsencrypt/live/REDIRECTOR_DOMAIN/fullchain.pem;",
    "    ssl_certificate_key /etc/letsencrypt/live/REDIRECTOR_DOMAIN/privkey.pem;",
    "",
  ];
  if (inp.blockScanners) {
    L.push("    # Sink common scanners/sandboxes to the decoy, whatever they request.");
    L.push(`    if ($http_user_agent ~* "(${SCANNER_UAS.join("|")})") {`);
    L.push(`        return 302 ${inp.decoy};`);
    L.push("    }");
    L.push("");
  }
  L.push("    # Valid beacon URIs -> team server (after the User-Agent check).");
  L.push(`    location ~ ^(${uriGroup})$ {`);
  if (inp.userAgent) {
    L.push(`        if ($http_user_agent != "${inp.userAgent}") {`);
    L.push(`            return 302 ${inp.decoy};`);
    L.push("        }");
  }
  L.push(`        proxy_pass ${inp.teamServer};`);
  L.push("        proxy_ssl_verify off;");
  L.push("        proxy_set_header Host $host;");
  L.push("    }");
  L.push("");
  L.push("    # Everything else -> decoy.");
  L.push("    location / {");
  L.push(`        return 302 ${inp.decoy};`);
  L.push("    }");
  L.push("}");
  return L.join("\n");
}

function buildApache(inp: RedirectorInput): string {
  const uriGroup = inp.uris.map(escapeRegex).join("|");
  const L: string[] = [
    "# Apache mod_rewrite C2 redirector.",
    "# Enable: a2enmod rewrite proxy proxy_http ssl headers",
    "# Place inside your <VirtualHost *:443> (SSLEngine On, with a valid cert).",
    "RewriteEngine On",
    "SSLProxyEngine On",
    "SSLProxyVerify none",
    "SSLProxyCheckPeerCN off",
    "SSLProxyCheckPeerName off",
    "",
  ];
  if (inp.blockScanners) {
    L.push("# Sink common scanners/sandboxes to the decoy.");
    L.push(`RewriteCond %{HTTP_USER_AGENT} (${SCANNER_UAS.join("|")}) [NC]`);
    L.push(`RewriteRule ^.*$ ${inp.decoy} [R=302,L]`);
    L.push("");
  }
  L.push(
    "# Valid beacon traffic: matching URI" +
      (inp.userAgent ? " + User-Agent" : "") +
      " -> team server.",
  );
  L.push(`RewriteCond %{REQUEST_URI} ^(${uriGroup})$`);
  if (inp.userAgent) {
    L.push(`RewriteCond %{HTTP_USER_AGENT} "^${escapeRegex(inp.userAgent)}$"`);
  }
  L.push(`RewriteRule ^.*$ ${inp.teamServer}%{REQUEST_URI} [P,L]`);
  L.push("");
  L.push("# Everything else -> decoy.");
  L.push(`RewriteRule ^.*$ ${inp.decoy} [R=302,L]`);
  return L.join("\n");
}

export function generateRedirector(inp: RedirectorInput): RedirectorResult {
  const empty = { nginx: "", apache: "", warnings: [] as string[] };
  if (inp.uris.length === 0) {
    return {
      ...empty,
      error: "No URIs to match. Paste a Cobalt Strike profile, or add URIs manually.",
    };
  }
  if (!inp.teamServer.trim()) {
    return {
      ...empty,
      error: "Set the team server address (where valid beacon traffic is proxied).",
    };
  }

  const norm: RedirectorInput = {
    ...inp,
    teamServer: inp.teamServer.trim(),
    decoy: inp.decoy.trim() || "https://www.example.com",
  };

  const warnings: string[] = [];
  if (!inp.userAgent) {
    warnings.push(
      "No User-Agent to match, so traffic is filtered on URI alone (weaker). Set the User-Agent from your profile to reject scanners that hit the right path.",
    );
  }
  if (!inp.decoy.trim()) {
    warnings.push(
      "No decoy set; using https://www.example.com. Point it at a believable, unrelated site.",
    );
  }
  if (!/^https?:\/\//i.test(norm.teamServer)) {
    warnings.push(
      "Team server has no http(s):// scheme. proxy_pass and the [P] rewrite need a full URL.",
    );
  }

  return { nginx: buildNginx(norm), apache: buildApache(norm), warnings, error: "" };
}
