import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { decryptCpassword } from "./logic";

export default function GppCpasswordTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (input.trim() === "") {
      setOutput("");
      setError("");
      return;
    }
    let cancelled = false;
    decryptCpassword(input)
      .then((pw) => {
        if (!cancelled) {
          setOutput(pw);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setOutput("");
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      <Field
        label="GPP cpassword"
        hint="Paste the cpassword from a Groups.xml / Services.xml / ScheduledTasks.xml on SYSVOL. Decrypted in your browser with Microsoft's published key — nothing leaves the machine."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="j1Uyj3Vx8TY9LtLZil2uAuZkFQA/4latT76ZwgdHdhw"
          rows={3}
        />
      </Field>

      {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea value={output} label="Password" filename="gpp-password.txt" mono />
    </>
  );
}
