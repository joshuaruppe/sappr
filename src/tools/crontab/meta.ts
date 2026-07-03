import { CalendarClock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "crontab",
  title: "Crontab",
  description:
    "Explain cron schedules in plain English and flag persistence and privilege-escalation red flags: @reboot jobs, writable script paths and PATH hijacks.",
  category: "linux",
  icon: CalendarClock,
  keywords: [
    "cron",
    "crontab",
    "cron.d",
    "schedule",
    "cron expression",
    "@reboot",
    "systemd timer",
    "persistence",
    "privesc",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
