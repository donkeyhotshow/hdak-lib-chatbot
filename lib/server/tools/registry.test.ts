import { describe, expect, it } from "vitest";
import { getTool, listTools, validateToolArgs } from "./registry";

describe("tool registry", () => {
  it("lists core chat tools", () => {
    const tools = listTools();
    expect(tools).toContain("searchLibraryResources");
    expect(tools).toContain("getCatalogSearchLink");
    expect(tools).toContain("findUpcomingLibraryEvents");
  });

  it("returns tool definitions by name", () => {
    const tool = getTool("searchLibraryResources");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("searchLibraryResources");
  });

  it("validates tool arguments against schemas", () => {
    expect(
      validateToolArgs("searchLibraryResources", { query: "catalog" })
    ).toBe(true);
    expect(validateToolArgs("searchLibraryResources", { query: 123 })).toBe(
      false
    );
    expect(validateToolArgs("unknownTool", { query: "x" })).toBe(false);
  });
});
