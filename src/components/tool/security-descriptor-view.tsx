import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import {
  toSddl,
  type ParsedAce,
  type ParsedAcl,
  type ParsedSid,
  type SecurityDescriptor,
} from "@/lib/security-descriptor";

function aceKind(type: string): { label: string; variant: "success" | "warning" | "muted" } {
  if (type.startsWith("ACCESS_ALLOWED")) return { label: "Allow", variant: "success" };
  if (type.startsWith("ACCESS_DENIED")) return { label: "Deny", variant: "warning" };
  if (type.startsWith("SYSTEM_AUDIT")) return { label: "Audit", variant: "muted" };
  if (type === "SYSTEM_MANDATORY_LABEL") return { label: "Integrity", variant: "muted" };
  return { label: type, variant: "muted" };
}

function sidLabel(sid: ParsedSid): string {
  return sid.name ? `${sid.name} (${sid.sid})` : sid.sid;
}

function AceRow({ ace }: { ace: ParsedAce }) {
  const kind = aceKind(ace.type);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card/60 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={kind.variant}>{kind.label}</Badge>
        <span className="font-mono text-xs font-medium text-foreground">
          {ace.trustee.name ?? ace.trustee.sid}
        </span>
        {ace.trustee.name ? (
          <span className="font-mono text-[0.7rem] text-muted-foreground/70">
            {ace.trustee.sid}
          </span>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">Rights:</span>{" "}
        {ace.rights.length ? ace.rights.join(" · ") : "(none)"}
      </div>
      {ace.flags.length ? (
        <div className="text-xs text-muted-foreground">
          <span className="text-muted-foreground/70">Flags:</span> {ace.flags.join(" · ")}
        </div>
      ) : null}
      {ace.objectType ? (
        <div className="text-xs text-muted-foreground">
          <span className="text-muted-foreground/70">Object:</span>{" "}
          {ace.objectTypeName ? (
            <span className="font-medium text-primary">{ace.objectTypeName}</span>
          ) : (
            <span className="font-mono text-[0.7rem]">{ace.objectType}</span>
          )}
        </div>
      ) : null}
      {ace.inheritedObjectType ? (
        <div className="text-xs text-muted-foreground">
          <span className="text-muted-foreground/70">Applies to:</span>{" "}
          {ace.inheritedObjectTypeName ? (
            <span className="font-medium text-foreground">{ace.inheritedObjectTypeName}</span>
          ) : (
            <span className="font-mono text-[0.7rem]">{ace.inheritedObjectType}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AclSection({
  title,
  present,
  acl,
}: {
  title: string;
  present: boolean;
  acl?: ParsedAcl;
}) {
  if (!present) {
    return (
      <p className="text-xs text-muted-foreground/70">
        No {title} (access not restricted by this list).
      </p>
    );
  }
  const aces = acl?.aces ?? [];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        {title} · {aces.length} {aces.length === 1 ? "entry" : "entries"}
      </p>
      {aces.length === 0 ? (
        <p className="text-xs text-warning">
          Present but empty — this denies all access (an explicit lockout).
        </p>
      ) : (
        aces.map((ace, i) => <AceRow key={i} ace={ace} />)
      )}
    </div>
  );
}

/** Renders a parsed Windows security descriptor: SDDL, owner/group, DACL, SACL. */
export function SecurityDescriptorView({ sd }: { sd: SecurityDescriptor }) {
  const sddl = toSddl(sd);
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldAlert className="size-4 text-primary" />
        Windows Security Descriptor
        <span className="text-xs font-normal text-muted-foreground">
          decoded from the bytes
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground">
          {sddl}
        </code>
        <CopyButton value={sddl} />
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <div>
          <span className="text-muted-foreground/70">Owner:</span>{" "}
          <span className="font-mono text-foreground">
            {sd.owner ? sidLabel(sd.owner) : "(none)"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground/70">Group:</span>{" "}
          <span className="font-mono text-foreground">
            {sd.group ? sidLabel(sd.group) : "(none)"}
          </span>
        </div>
        {sd.controlFlags.length ? (
          <div className={cn("flex flex-wrap items-center gap-1", "pt-1")}>
            {sd.controlFlags
              .filter((f) => f !== "SELF_RELATIVE")
              .map((f) => (
                <Badge key={f} variant="outline">
                  {f}
                </Badge>
              ))}
          </div>
        ) : null}
      </div>

      <AclSection title="DACL" present={sd.daclPresent} acl={sd.dacl} />
      {sd.saclPresent ? <AclSection title="SACL (auditing)" present acl={sd.sacl} /> : null}
    </div>
  );
}
