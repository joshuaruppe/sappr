import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { SecurityDescriptorView } from "@/components/tool/security-descriptor-view";
import { parseSdInput } from "./logic";

export default function SecurityDescriptorTool() {
  const [input, setInput] = useState("");
  const { sd, format, error } = useMemo(() => parseSdInput(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Security descriptor (Base64 or hex)"
        hint="Paste a self-relative SECURITY_DESCRIPTOR — e.g. an AD nTSecurityDescriptor blob or the output of a Get-Acl .GetSecurityDescriptorBinaryForm(). It's parsed entirely in your browser; nothing leaves this machine."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"AQAEgBQAAAAg…   (Base64)\n0100048014000000…   (hex)"}
          rows={5}
        />
      </Field>

      {hasInput && error ? <ErrorNote>{error}</ErrorNote> : null}

      {sd ? (
        <>
          {format ? (
            <p className="text-xs text-muted-foreground">
              Parsed as <span className="font-medium text-foreground">{format}</span>.
            </p>
          ) : null}
          <SecurityDescriptorView sd={sd} />
        </>
      ) : null}
    </>
  );
}
