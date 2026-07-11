import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { KerberosTicketView } from "@/components/tool/kerberos-ticket-view";
import { parseTicketInput } from "./logic";

// A synthetic krbtgt TGT .kirbi (fabricated, NOT a real ticket), Base64 as Rubeus emits it.
const SAMPLE =
  "doIBjzCCAYugAwIBBaEDAgEWooGDMIGAYX4wfKADAgEFoQ8bDUVYQU1QTEUuTE9DQUyiIjAgoAMCAQKhGTAXGwZrcmJ0Z3QbDUVYQU1QTEUuTE9DQUyjQDA+oAMCARKhAwIBAqIyBDCrq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6ujgfgwgfWgAwIBAKKB7QSB6n2B5zCB5KCB4TCB3jCB26ArMCmgAwIBEqEiBCAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH6EPGw1FWEFNUExFLkxPQ0FMohEwD6ADAgEBoQgwBhsEamRvZaMHAwUAQOAAAKQRGA8yMDI2MDEwMTEyMDAwMFqlERgPMjAyNjAxMDExMjAwMDBaphEYDzIwMjYwMTAxMjIwMDAwWqcRGA8yMDI2MDEwODEyMDAwMFqoDxsNRVhBTVBMRS5MT0NBTKkiMCCgAwIBAqEZMBcbBmtyYnRndBsNRVhBTVBMRS5MT0NBTA==";

export default function KerberosTicketTool() {
  const [input, setInput] = useState("");
  const { cred, format, error } = useMemo(() => parseTicketInput(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Kerberos ticket (.kirbi / KRB-CRED, Base64 or hex)"
        hint="Paste a base64 .kirbi - e.g. Rubeus asktgt/dump or Mimikatz output. The ticket itself stays encrypted (sealed with the service/krbtgt key); this reads the unencrypted envelope: session key, flags, validity and target."
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
          placeholder="doIBjzCCAYugAwIBBaEDAgEW…"
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
