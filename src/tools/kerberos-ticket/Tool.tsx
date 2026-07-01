import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { KerberosTicketView } from "@/components/tool/kerberos-ticket-view";
import { parseTicketInput } from "./logic";

export default function KerberosTicketTool() {
  const [input, setInput] = useState("");
  const { cred, format, error } = useMemo(() => parseTicketInput(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Kerberos ticket (.kirbi / KRB-CRED, Base64 or hex)"
        hint="Paste a base64 .kirbi — e.g. Rubeus asktgt/dump or Mimikatz output. Decoded entirely in your browser. The ticket itself stays encrypted (sealed with the service/krbtgt key); this reads the unencrypted envelope: session key, flags, validity and target."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="doIFmDCCBZSgAwIBBaEDAgEW…"
          rows={5}
        />
      </Field>

      {hasInput && error ? <ErrorNote>{error}</ErrorNote> : null}

      {cred ? (
        <>
          {format ? (
            <p className="text-xs text-muted-foreground">
              Parsed as <span className="font-medium text-foreground">{format}</span>.
            </p>
          ) : null}
          <KerberosTicketView cred={cred} />
        </>
      ) : null}
    </>
  );
}
