import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import type { KerberosCred, KerberosCredInfo, KerberosTime } from "@/lib/kerberos";

function validity(end?: KerberosTime): { label: string; variant: "success" | "warning" } | null {
  if (!end || Number.isNaN(end.epochMs)) return null;
  const now = Date.now();
  if (end.epochMs <= now) return { label: "expired", variant: "warning" };
  const mins = Math.round((end.epochMs - now) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { label: `valid ${h > 0 ? `${h}h ` : ""}${m}m`, variant: "success" };
}

function TimeRow({ label, t }: { label: string; t?: KerberosTime }) {
  if (!t) return null;
  return (
    <div className="text-xs">
      <span className="text-muted-foreground/70">{label}:</span>{" "}
      <span className="font-mono text-foreground">{t.display}</span>
    </div>
  );
}

function CredInfoCard({ info }: { info: KerberosCredInfo }) {
  const v = validity(info.endTime);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {info.service ? (
          <span className="text-sm font-semibold text-foreground">{info.service.name}</span>
        ) : null}
        {v ? <Badge variant={v.variant}>{v.label}</Badge> : null}
      </div>

      <div className="text-xs">
        <span className="text-muted-foreground/70">Client:</span>{" "}
        <span className="font-mono text-foreground">
          {info.client?.name}
          {info.clientRealm ? ` @ ${info.clientRealm}` : ""}
        </span>
      </div>

      {info.flags.length ? (
        <div className="flex flex-wrap items-center gap-1">
          {info.flags.map((f) => (
            <Badge key={f} variant="outline">
              {f}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-0.5">
        <TimeRow label="Start" t={info.startTime} />
        <TimeRow label="End" t={info.endTime} />
        <TimeRow label="Renew till" t={info.renewTill} />
      </div>

      <div className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-[0.7rem] text-muted-foreground/70">
            Session key ({info.keyTypeName})
          </div>
          <code className="block truncate font-mono text-xs text-foreground">{info.keyBase64}</code>
        </div>
        <CopyButton value={info.keyBase64} />
      </div>
    </div>
  );
}

/** Renders a decoded Kerberos KRB-CRED / .kirbi (ticket ref + readable cred part). */
export function KerberosTicketView({ cred }: { cred: KerberosCred }) {
  const t = cred.tickets[0];
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Ticket className="size-4 text-primary" />
        Kerberos Ticket
        <Badge variant={cred.isTgt ? "primary" : "muted"}>
          {cred.isTgt ? "TGT" : "service ticket"}
        </Badge>
      </div>

      {t ? (
        <div className="text-xs text-muted-foreground">
          <span className="text-muted-foreground/70">Ticket:</span>{" "}
          <span className="font-mono text-foreground">{t.sname.name}</span>{" "}
          <span className="text-muted-foreground/70">@ {t.realm}</span> · encrypted with{" "}
          <span className="font-mono">{t.encPart.etypeName}</span>
          {t.encPart.kvno !== undefined ? ` (kvno ${t.encPart.kvno})` : ""}. Sealed with the
          service/krbtgt key — not decrypted here.
        </div>
      ) : null}

      {cred.credEncrypted ? (
        <p className="text-xs text-warning">
          The KRB-CRED envelope is encrypted (etype {cred.credEtype}), so the session key and
          metadata can't be read without its key.
        </p>
      ) : (
        cred.info.map((i, idx) => <CredInfoCard key={idx} info={i} />)
      )}
    </div>
  );
}
