import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { analyzeHeaders } from "./logic";

const SAMPLE = `Received: from mail.evil-relay.net (mail.evil-relay.net [203.0.113.55])
	by mx.company.com (Postfix) with ESMTPS id 4abcd
	for <victim@company.com>; Tue, 08 Jul 2026 09:15:42 -0400
Received: from unknown (HELO localhost)
	by mail.evil-relay.net with SMTP; Tue, 08 Jul 2026 09:15:10 -0400
Authentication-Results: mx.company.com;
	spf=softfail smtp.mailfrom=marketing-blast.net;
	dkim=none;
	dmarc=fail (p=reject) header.from=company.com
From: IT Support <it-support@company.com>
Reply-To: helpdesk@secure-verify.example
Return-Path: <bounce@marketing-blast.net>
To: victim@company.com
Subject: Action Required: Verify Your Account
Date: Tue, 08 Jul 2026 09:15:05 -0400
Message-ID: <20260708131505.4abcd@mail.evil-relay.net>`;

const AUTH_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  pass: "success",
  fail: "warning",
  softfail: "warning",
  neutral: "muted",
  none: "muted",
};

function AuthBadge({ label, value }: { label: string; value: string }) {
  return (
    <Badge variant={value ? (AUTH_VARIANT[value] ?? "muted") : "muted"}>
      {label} {value || "n/a"}
    </Badge>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function EmailHeadersTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => analyzeHeaders(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Raw email headers"
        hint="Paste the full headers (from 'Show original' / 'View source'). Parsed locally; nothing is uploaded."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Received: from ...  by ...;  <date>&#10;Authentication-Results: ... spf=... dkim=... dmarc=...&#10;From: ..."
          rows={8}
        />
      </Field>

      {result.error ? <ErrorNote>{result.error}</ErrorNote> : null}

      {hasInput && !result.error ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <AuthBadge label="SPF" value={result.auth.spf} />
            <AuthBadge label="DKIM" value={result.auth.dkim} />
            <AuthBadge label="DMARC" value={result.auth.dmarc} />
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/40 p-3">
            <Row label="From" value={result.summary.from} />
            <Row label="Reply-To" value={result.summary.replyTo} />
            <Row label="Return-Path" value={result.summary.returnPath} />
            <Row label="To" value={result.summary.to} />
            <Row label="Subject" value={result.summary.subject} />
            <Row label="Date" value={result.summary.date} />
            <Row label="Message-ID" value={result.summary.messageId} />
          </div>

          {result.hops.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivery path ({result.hops.length} hop{result.hops.length === 1 ? "" : "s"})
              </div>
              {result.hops.map((h, i) => (
                <div key={i} className="flex flex-col gap-0.5 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span>{h.from || "?"}</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span>{h.by || "?"}</span>
                    {h.with ? <span className="text-muted-foreground">({h.with})</span> : null}
                    {h.delaySec !== null ? (
                      <span className="text-muted-foreground">
                        +{h.delaySec}s
                      </span>
                    ) : null}
                  </div>
                  {h.dateDisplay ? (
                    <div className="pl-4 text-xs text-muted-foreground">{h.dateDisplay}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <FindingsSection
            findings={result.findings}
            title="Findings"
            emptyLabel="No auth failures or header mismatches detected."
            defaultOpen={result.findings.some((f) => f.severity !== "info")}
          />
        </>
      ) : null}
    </>
  );
}
