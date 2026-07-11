import { KeySquare } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "ssh-authorized-keys",
  title: "SSH authorized_keys",
  description:
    "Analyze an SSH authorized_keys file - SHA-256 fingerprint each key, show its options, and flag weak algorithms and unrestricted keys (a top persistence vector).",
  category: "linux",
  icon: KeySquare,
  keywords: [
    "ssh",
    "authorized_keys",
    "public key",
    "fingerprint",
    "sha256",
    "ed25519",
    "rsa",
    "ssh-dss",
    "persistence",
    "backdoor",
    "t1098",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
