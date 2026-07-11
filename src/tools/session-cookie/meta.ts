import { Cookie } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "session-cookie",
  title: "Session Cookie",
  description:
    "Decode a signed web session cookie without the secret - Flask/itsdangerous (incl. compressed), a JWT-in-cookie, or a Django signed value - and see it's readable and forgeable.",
  category: "web",
  icon: Cookie,
  keywords: [
    "session cookie",
    "flask",
    "itsdangerous",
    "flask-unsign",
    "jwt",
    "django",
    "signed cookie",
    "decode",
    "secret",
    "web",
  ],
  execution: "client",
  status: "beta",
};
