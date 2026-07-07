import { CircleAlert } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "error-decode",
  title: "Windows Error Code",
  description:
    "Look up a Windows error code across NTSTATUS, Win32 and HRESULT at once, decode the HRESULT bit-fields (severity/facility/code), and unwrap FACILITY_WIN32 (0x8007xxxx) HRESULTs to the underlying Win32 error.",
  category: "windows",
  icon: CircleAlert,
  keywords: [
    "error code",
    "ntstatus",
    "hresult",
    "win32",
    "status",
    "err.exe",
    "0x8007",
    "bugcheck",
    "getlasterror",
    "system error",
    "facility",
  ],
  execution: "client",
  status: "beta",
};
