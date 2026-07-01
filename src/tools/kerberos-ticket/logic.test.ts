import { describe, it, expect } from "vitest";
import { parseTicketInput } from "./logic";

// ngreen TGT .kirbi (CRTO lab, not real creds), base64 as Rubeus emits it.
const KIRBI =
  "doIFmDCCBZSgAwIBBaEDAgEWooIEojCCBJ5hggSaMIIElqADAgEFoQ0bC0NPTlRPU08uQ09NoiAwHqADAgECoRcwFRsGa3JidGd0Gwtjb250b3NvLmNvbaOCBFwwggRYoAMCARKhAwIBAqKCBEoEggRGY167RFJ10cNWI3PA0MpYQMo4kD9nz5fvO75u0y70dRkJ/1Ku3fsJ0Y2Vsoir7EoLnlif6Ur3WFLxLdSS8hPWbGW1XWsmM1fY6ZulVWT3yzGN5lMP2ax4nDZ+4hnTflT7u9Oahw7E7fjusVVmrwxIhkh2uY9d/A+AmBZ9XZ/HCUREpdM08bG4LPXDA4PGOTAtLflHj6O67eMt7OMu+gpJh64aiEm1NB8ZDhcUF/s33f/v0fV0TwxNpTF6FzrZiXJafRjSXUSWQm5Q8oFtX4ao8e9JZi0IYT9fARxGeEoojoBEU+RbZVF2JY+QMCxxqZocF47xEpukbauJuS9lvWUO9eLmT6lgWCeYc06ctTc+H31iSKXtcweByPzIQhpeaEoYNnpR8gB8y78375KWiLCr5WIbCKaQfxb6oHG8eotnD05m8xa3uM062EDa9oBA101VlsTGL26PQoOHnVzMWvpGV/BXS9q75H6yhDBhxfpBRZrzfYBKcNptBHpG8HYQSau3nqbO95FbkqAIlfXkEQ3hPTG2MPG6T1ty2sZnjVDmLC6PyoYfUOx8H7sdrnqnMWUkHKBrL3B9NIFQiNtJOJsfmPI3ESKrtfS+4+IgXKzSL1Bu6PxJrBX8CMOn5bZgHkZCF1Tqd3zfzNCGkkPbUnLCnjgd6GMZcTWTLUqHeimoFOq9zLnDrFVaNXo6jHcd2mtf5OzFsoS1+58NeaKE1BFvap+kfB6aifBJlZe6+c1W5bWHV3g0S7N6jg2LPjVh8GbzTS3mFUM0C3IPnHs827mR10XiZUEc7r/4fKcRMg0spLqpOwBdw+A4MxYgMmHuO0/zRrh9Y05QC5J+i5EN4rnXjz69FzsavEE6QZhSeCAkHwOsDELjeZ8oOdtAj4XfV2MogZuVYh3FW9tgViJz2F8ZEBeSFDXkE5YAb0d/I2NiUrK9izEQe+aspnpAlHH9Af+ZkubWgVye3Ow+0zkTNR4NGGem78ZEk9U9j2KssKK4jNYe2CZmDt49YDbY4UJ1/No4NK8oDn5BmJbnmvB6z1UYSg+pKPoHN7O1IrGuRt+jPsdtieqMF6URqyncXUh3MHEPRbDBZ6xY0FtB7die42/RbLRG23zNhvqYAJlq0kUaBQua2ds/if8oMrATSW5fqJ0OS9fse5MUS4TQDhE/yzRWLQcmnOhdu3a+sKOr25PVC1KBWhAQlPisYWrh/8vDA19ZWzWjfHp/gFYoImv7adLZ1eJumtZ6l6wyhrLqgVHVrEI2ZmJslnqQ7QPQ5WYh1umhV+fzhDBt9KuIX20liMKU3jQAqX+9kjEPMUBaVxtcgZAJg5PAZQTb54/ejUNQTm+9p4Qh47GK9t8sopDVSlF0JvrVtBvssQoowprj76h8X+grigy2Q5qOmqKYpvzGNpwOTRbg7ByNFktLOaJ6jB70aKGTpyrKJ76qciXUFArntTHPciVqCQOjgeEwgd6gAwIBAKKB1gSB032B0DCBzaCByjCBxzCBxKArMCmgAwIBEqEiBCAEeczH6NgnLmuH4p5aYclbMPpcc33j6Wf60FStvoPBQKENGwtDT05UT1NPLkNPTaITMBGgAwIBAaEKMAgbBm5ncmVlbqMHAwUAQOEAAKURGA8yMDI2MDYzMDE4MjE0NVqmERgPMjAyNjA3MDEwNDIxNDVapxEYDzIwMjYwNzA3MTgyMTQ1WqgNGwtDT05UT1NPLkNPTakgMB6gAwIBAqEXMBUbBmtyYnRndBsLY29udG9zby5jb20=";

describe("kerberos ticket tool input parsing", () => {
  it("parses a base64 .kirbi", () => {
    const r = parseTicketInput(KIRBI);
    expect(r.error).toBe("");
    expect(r.format).toBe("base64");
    expect(r.cred?.isTgt).toBe(true);
    expect(r.cred?.tickets[0].sname.name).toBe("krbtgt/contoso.com");
  });

  it("errors on text that is not a ticket", () => {
    const r = parseTicketInput("not a ticket");
    expect(r.cred).toBeNull();
    expect(r.error).not.toBe("");
  });

  it("is blank for empty input", () => {
    expect(parseTicketInput("  ")).toEqual({ cred: null, format: null, error: "" });
  });
});
