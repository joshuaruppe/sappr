import { describe, expect, it } from "vitest";
import { wrangleScope, EXPAND_CAP } from "./logic";

describe("wrangleScope", () => {
  it("returns an empty result for blank input", () => {
    const r = wrangleScope("   \n  ");
    expect(r.stats.ipv4Hosts).toBe(0);
    expect(r.hosts).toEqual([]);
    expect(r.error).toBe("");
  });

  it("expands a /30 to its four hosts, sorted", () => {
    const r = wrangleScope("10.0.0.0/30");
    expect(r.hosts).toEqual(["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3"]);
    expect(r.stats.ipv4Hosts).toBe(4);
  });

  it("normalizes a CIDR whose host bits are set", () => {
    const r = wrangleScope("10.0.0.5/24");
    expect(r.cidrs).toEqual(["10.0.0.0/24"]);
    expect(r.stats.ipv4Hosts).toBe(256);
  });

  it("collapses contiguous input into a single CIDR", () => {
    const r = wrangleScope("10.0.0.0/25\n10.0.0.128/25");
    expect(r.cidrs).toEqual(["10.0.0.0/24"]);
  });

  it("aggregates a non-aligned range into minimal CIDRs", () => {
    // 10.0.0.1 and 10.0.0.2 straddle a /31 boundary → two /32s.
    expect(wrangleScope("10.0.0.1-10.0.0.2").cidrs).toEqual(["10.0.0.1/32", "10.0.0.2/32"]);
    // 10.0.0.0 .. 10.0.0.5 → /29 covers .0-.7? no — exact: /30 (.0-.3) + /31 (.4-.5)
    expect(wrangleScope("10.0.0.0-10.0.0.5").cidrs).toEqual(["10.0.0.0/30", "10.0.0.4/31"]);
  });

  it("parses an nmap-style short range", () => {
    const r = wrangleScope("192.168.1.1-5");
    expect(r.hosts).toEqual([
      "192.168.1.1",
      "192.168.1.2",
      "192.168.1.3",
      "192.168.1.4",
      "192.168.1.5",
    ]);
  });

  it("dedupes across overlapping forms and counts the drops", () => {
    const r = wrangleScope("10.0.0.0/24 10.0.0.0/24 10.0.0.5");
    // Two exact-dup tokens dropped; the /24 already contains .5 so hosts stay 256.
    expect(r.stats.duplicatesRemoved).toBe(1); // second identical /24
    expect(r.stats.ipv4Hosts).toBe(256);
    expect(r.cidrs).toEqual(["10.0.0.0/24"]);
  });

  it("strips ports and URL wrappers to the underlying host", () => {
    const r = wrangleScope("http://10.0.0.5:8080/admin  10.0.0.5:443");
    expect(r.stats.ipv4Hosts).toBe(1);
    expect(r.hosts).toEqual(["10.0.0.5"]);
    expect(r.stats.duplicatesRemoved).toBe(1);
  });

  it("classifies hostnames but keeps them out of IP expansion", () => {
    const r = wrangleScope("dc01.corp.local https://target.example.com/login");
    expect(r.hostnames).toContain("dc01.corp.local");
    expect(r.hostnames).toContain("target.example.com");
    expect(r.hosts).toEqual([]);
  });

  it("normalizes and dedupes IPv6, without expanding it", () => {
    const r = wrangleScope("2001:0db8:0000:0000:0000:0000:0000:0001 2001:db8::1 [2001:db8::2]:443");
    expect(r.ipv6).toEqual(["2001:db8::1", "2001:db8::2"]);
    expect(r.stats.duplicatesRemoved).toBe(1);
    expect(r.hosts).toEqual([]);
  });

  it("keeps an IPv6 CIDR intact (does not split on the slash)", () => {
    const r = wrangleScope("2001:db8::/48");
    expect(r.ipv6).toEqual(["2001:db8::/48"]);
  });

  it("surfaces unparseable tokens instead of dropping them silently", () => {
    const r = wrangleScope("10.0.0.5, notes, 10.0.0.256, engagement");
    expect(r.invalid).toContain("notes");
    expect(r.invalid).toContain("engagement");
    expect(r.stats.invalid).toBe(2);
    // A bad octet is IP-shaped, so it's a likely typo rather than plain junk.
    expect(r.malformed).toEqual(["10.0.0.256"]);
    expect(r.hosts).toEqual(["10.0.0.5"]);
  });

  it("builds a single nmap-ready target line from mixed input", () => {
    const r = wrangleScope("10.0.0.0/24 2001:db8::1 host.example.com");
    expect(r.targets).toBe("10.0.0.0/24 2001:db8::1 host.example.com");
  });

  it("caps host expansion but still reports the true total and collapses fully", () => {
    const r = wrangleScope("10.0.0.0/8");
    expect(r.stats.ipv4Hosts).toBe(16777216);
    expect(r.stats.capped).toBe(true);
    expect(r.hosts.length).toBe(EXPAND_CAP);
    expect(r.cidrs).toEqual(["10.0.0.0/8"]);
    expect(r.findings.some((f) => f.severity === "medium" && /expands to/.test(f.message))).toBe(true);
  });

  it("salvages a leading IPv4 from mistyped `::port` and `/proto:port` junk", () => {
    const r = wrangleScope("72.185.86.56:: 8080\n74.243.227.81::443\n95.26.134.69/tcp:8443");
    expect(r.hosts).toContain("72.185.86.56");
    expect(r.hosts).toContain("74.243.227.81");
    expect(r.hosts).toContain("95.26.134.69");
    // ...and none of them get mis-filed as a bogus IPv6 address.
    expect(r.ipv6).toEqual([]);
  });

  it("pulls every IPv4 out of a real-world, heavily-annotated scope dump", () => {
    // Regression fixture: an actual messy pentest scope. Every IPv4 must survive
    // the cleanup — this list is the ground truth (46 distinct addresses).
    const messy = `### our IPs - rough list, needs cleanup - Josh pls parse
# some of these might be dead, idk
web-prod-01.corp.local:8080     153.195.224.51, 220.79.62.45 - port 443 (maybe? check w/ netops)  http://65.233.61.171:3000
srv203--db.internal   203.92.66.209 5432/tcp
17.213.166.67:22  mail-gw.example.com > 124.186.156.126 :25 ; 6-161-112-234.dyn.someisp.net
67.137.84.194,8443 [255.246.79.51]:9090
vpn01	90.220.203.10 - 1194 udp
65.47.186.105 (old jump box?) 72.185.86.56:: 8080   40.198.193.183 port 3389 rdp
95.26.134.69/tcp:8443
host14.internal 14.157.67.77   ::80 / 187-30-240-31.staticprovider.com.br / ftp   5.15.246.18 :21
191.77.20.140     this one's flaky
32.116.238.236:1521 oracle?  app-node-227.prod 227.93.61.54,,443
45.5.53.221 8006 proxmox | tcp://2.228.196.96:6379 | 131.59.33.110 - 8080 - 8443 - 9000
74.243.227.81::443 165.48.84.105  (DMZ)  :10250
k8s-master	251.214.159.8:6443
90.185.112.75	9200 elasticsearch    smb 24.153.222.132 :445/tcp
102.244.209.153 - dunno what this is    120.47.226.47:5900 vnc
83-27-73-180.dsl.net.pl :22   250.82.106.5,,8888   185.113.105.52 (gitlab) 80/443
git.internal.corp > 213.131.6.20:2222
159.115.224.50   ::: 3000 sql-01 51.203.128.22 1433 196.153.177.122 port=8080
grafana 67.168.10.235:3000
182.0.219.8 -- 8443 -- maybe old cert   149.220.83.56	9090	prometheus
30.124.80.84 (printer lol) :9100 240.181.161.144:161 snmp 216-22-202-186.cloudhost.net 443
154.45.76.51,8080,8081,8082
57.41.65.165  ::22  ::80  ::443    112.4.111.106 - port 27017 mongo
dc01.corp.local 222.82.189.178:389 ldap  220.248.156.113 	 (no idea)  https://98.99.224.157:8443/login
bastion-161 161.75.168.112 :22 <- prod only`;
    const r = wrangleScope(messy);
    expect(r.stats.ipv4Hosts).toBe(46);
    expect(r.hosts).toHaveLength(46);
    // The three that the pre-fix parser used to drop.
    for (const ip of ["72.185.86.56", "74.243.227.81", "95.26.134.69"]) {
      expect(r.hosts).toContain(ip);
    }
  });

  it("separates IP-shaped typos from ordinary junk and warns about them", () => {
    const r = wrangleScope("192.256.4.3 10.0.0.999 10.0.0.0/33 oracle? notes 10.0.0.5");
    // The IP-shaped-but-invalid tokens are flagged as likely typos...
    expect(r.malformed).toEqual(["192.256.4.3", "10.0.0.999", "10.0.0.0/33"]);
    expect(r.stats.malformed).toBe(3);
    // ...and kept out of the ordinary-junk bucket.
    expect(r.invalid).toContain("oracle?");
    expect(r.invalid).toContain("notes");
    expect(r.malformed).not.toContain("oracle?");
    // A valid IP alongside them still parses.
    expect(r.hosts).toEqual(["10.0.0.5"]);
    // It raises a medium (warning) note that names the suspects.
    const warn = r.findings.find((f) => f.severity === "medium");
    expect(warn?.message).toMatch(/192\.256\.4\.3/);
    expect(warn?.message).toMatch(/typo/i);
  });

  it("handles 0.0.0.0/0 as the whole space", () => {
    const r = wrangleScope("0.0.0.0/0");
    expect(r.cidrs).toEqual(["0.0.0.0/0"]);
    expect(r.stats.ipv4Hosts).toBe(4294967296);
  });
});
