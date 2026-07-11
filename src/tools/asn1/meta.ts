import { ListTree } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "asn1",
  title: "ASN.1 / DER Decoder",
  description:
    "Decode ASN.1 DER/BER (X.509 certificates, keys, PKCS, CMS) into a readable tree - SEQUENCE/SET/INTEGER/OID and more, with common object identifiers named. Accepts hex, Base64 or PEM.",
  category: "reversing",
  icon: ListTree,
  keywords: [
    "asn1",
    "asn.1",
    "der",
    "ber",
    "x509",
    "certificate",
    "pkcs",
    "cms",
    "oid",
    "pem",
    "public key",
  ],
  execution: "client",
  status: "beta",
};
