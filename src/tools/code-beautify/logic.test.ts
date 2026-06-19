import { describe, expect, it } from "vitest";
import { beautify } from "./logic";

describe("code-beautify", () => {
  it("formats JavaScript (spacing + semicolons)", async () => {
    const out = await beautify("const x=1", "javascript");
    expect(out).toContain("const x = 1;");
  });

  it("formats TypeScript with type annotations", async () => {
    const out = await beautify("const x:number=1", "typescript");
    expect(out).toContain("const x: number = 1;");
  });

  it("pretty-prints minified JSON", async () => {
    const out = await beautify('{"a":1,"b":2}', "json");
    expect(out).toContain('"a": 1');
    expect(out).toContain("\n");
  });

  it("respects the tabWidth option", async () => {
    // Prettier keeps short objects on one line, so use a value long enough to
    // exceed printWidth and force the object to wrap (which applies indentation).
    const long = `{"key":"${"a".repeat(90)}"}`;
    const two = await beautify(long, "json", { tabWidth: 2 });
    const four = await beautify(long, "json", { tabWidth: 4 });
    expect(two).toContain('\n  "key"');
    expect(four).toContain('\n    "key"');
  });

  it("formats CSS", async () => {
    const out = await beautify("a{color:red}", "css");
    expect(out).toContain("color: red;");
  });

  it("formats SCSS with nesting", async () => {
    const out = await beautify(".a{.b{color:red}}", "scss");
    expect(out).toContain(".b {");
  });

  it("formats HTML", async () => {
    const out = await beautify("<div><p>hi</p></div>", "html");
    expect(out).toContain("<p>hi</p>");
    expect(out).toContain("\n");
  });

  it("formats Markdown", async () => {
    const out = await beautify("#   Title", "markdown");
    expect(out.trim()).toBe("# Title");
  });

  it("formats YAML (normalizes spacing)", async () => {
    const out = await beautify("name:    sappr", "yaml");
    expect(out.trim()).toBe("name: sappr");
  });

  it("formats SQL (uppercases keywords, indents)", async () => {
    const out = await beautify("select id from users where id=1", "sql");
    expect(out).toContain("SELECT");
    expect(out).toContain("FROM");
    expect(out).toContain("\n");
  });

  it("formats GraphQL", async () => {
    const out = await beautify("{a b}", "graphql");
    expect(out).toContain("\n  a");
    expect(out).toContain("\n  b");
  });

  it("indents XML by element depth", async () => {
    const out = await beautify("<a><b>x</b></a>", "xml");
    expect(out).toBe("<a>\n  <b>x</b>\n</a>");
  });

  it("respects tabWidth for XML", async () => {
    const out = await beautify("<a><b>x</b></a>", "xml", { tabWidth: 4 });
    expect(out).toContain("\n    <b>x</b>");
  });

  it("does not split > inside XML attribute values", async () => {
    const out = await beautify('<a t="x>y"><b/></a>', "xml");
    expect(out).toContain('<a t="x>y">');
    expect(out).toContain("<b/>");
  });

  it("returns empty string for empty input", async () => {
    expect(await beautify("", "javascript")).toBe("");
    expect(await beautify("", "json")).toBe("");
  });

  it("rejects on a syntax error", async () => {
    await expect(beautify("{ this is not json", "json")).rejects.toThrow();
  });
});
