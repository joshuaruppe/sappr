import { describe, expect, it } from "vitest";
import { analyzeHeaders } from "./logic";

const PHISH = `Received: from mail.evil-relay.net (mail.evil-relay.net [203.0.113.55])
\tby mx.company.com (Postfix) with ESMTPS id 4abcd
\tfor <victim@company.com>; Tue, 08 Jul 2026 09:15:42 -0400
Received: from unknown (HELO localhost)
\tby mail.evil-relay.net with SMTP; Tue, 08 Jul 2026 09:15:10 -0400
Authentication-Results: mx.company.com;
\tspf=softfail smtp.mailfrom=marketing-blast.net;
\tdkim=none;
\tdmarc=fail (p=reject) header.from=company.com
From: IT Support <it-support@company.com>
Reply-To: helpdesk@secure-verify.example
Return-Path: <bounce@marketing-blast.net>
To: victim@company.com
Subject: Action Required: Verify Your Account
Date: Tue, 08 Jul 2026 09:15:05 -0400
Message-ID: <20260708131505.4abcd@mail.evil-relay.net>

This is the body and must be ignored.
Received: this-should-not-be-parsed
`;

describe("analyzeHeaders", () => {
  it("errors on non-header text and stays empty for blank input", () => {
    expect(analyzeHeaders("just some words").error).toMatch(/No headers/);
    expect(analyzeHeaders("   ").hops).toEqual([]);
    expect(analyzeHeaders("   ").error).toBe("");
  });

  it("parses the summary headers, unfolding folded values", () => {
    const r = analyzeHeaders(PHISH);
    expect(r.summary.from).toBe("IT Support <it-support@company.com>");
    expect(r.summary.replyTo).toBe("helpdesk@secure-verify.example");
    expect(r.summary.subject).toBe("Action Required: Verify Your Account");
  });

  it("orders the Received chain oldest-first with hop delays", () => {
    const r = analyzeHeaders(PHISH);
    expect(r.hops).toHaveLength(2);
    // The older hop (09:15:10) comes first; the newer (09:15:42) second.
    expect(r.hops[0].by).toBe("mail.evil-relay.net");
    expect(r.hops[1].from).toBe("mail.evil-relay.net");
    expect(r.hops[1].delaySec).toBe(32);
  });

  it("stops parsing at the blank line (body is ignored)", () => {
    // The stray "Received:" in the body must not become a third hop.
    expect(analyzeHeaders(PHISH).hops).toHaveLength(2);
  });

  it("extracts SPF / DKIM / DMARC from Authentication-Results", () => {
    const r = analyzeHeaders(PHISH);
    expect(r.auth.spf).toBe("softfail");
    expect(r.auth.dkim).toBe("none");
    expect(r.auth.dmarc).toBe("fail");
  });

  it("flags the auth failures and the From/Return-Path/Reply-To mismatches", () => {
    const m = analyzeHeaders(PHISH).findings.map((f) => f.message).join(" || ");
    expect(m).toMatch(/SPF softfail/);
    expect(m).toMatch(/DMARC fail/);
    expect(m).toMatch(/Return-Path domain \(marketing-blast\.net\)/);
    expect(m).toMatch(/Reply-To domain \(secure-verify\.example\)/);
  });

  it("is quiet on a clean, aligned message", () => {
    const clean = `Received: from smtp.corp.example (smtp.corp.example [10.0.0.9])
\tby mx.corp.example with ESMTPS; Tue, 08 Jul 2026 10:00:00 -0400
Authentication-Results: mx.corp.example; spf=pass; dkim=pass; dmarc=pass
From: Alice <alice@corp.example>
Return-Path: <alice@corp.example>
Subject: Lunch?`;
    const nonInfo = analyzeHeaders(clean).findings.filter((f) => f.severity !== "info");
    expect(nonInfo).toEqual([]);
  });
});
