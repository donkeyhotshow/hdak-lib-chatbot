import { describe, expect, it } from "vitest";
import { z } from "zod";
import { executeSandboxedTool } from "./toolSandbox";

describe("toolSandbox", () => {
  it("rejects tools outside the allowlist", async () => {
    await expect(
      executeSandboxedTool({
        toolName: "notAllowedTool",
        input: {},
        schema: z.object({}),
        context: { endpoint: "/api/chat", userId: 1, ip: "1.1.1.1" },
        execute: async () => ({ ok: true }),
      })
    ).rejects.toThrow("not allowed");
  });

  it("rejects invalid parameters", async () => {
    await expect(
      executeSandboxedTool({
        toolName: "searchLibraryResources",
        input: { query: 42 },
        schema: z.object({ query: z.string() }),
        context: { endpoint: "/api/chat", userId: 1, ip: "1.1.1.1" },
        execute: async () => ({ ok: true }),
      })
    ).rejects.toThrow("Invalid parameters");
  });

  it("applies timeout to tool execution", async () => {
    await expect(
      executeSandboxedTool({
        toolName: "searchLibraryResources",
        input: { query: "db" },
        schema: z.object({ query: z.string() }),
        context: { endpoint: "/api/chat", userId: 1, ip: "1.1.1.1" },
        execute: async () =>
          await new Promise(resolve =>
            setTimeout(() => resolve({ ok: true }), 5500)
          ),
      })
    ).rejects.toThrow("timed out");
  });
});
