import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECURITY_CONFIG } from "../config/security";
import { executeTool } from "./toolExecutor";

vi.mock("../tools/registry", () => ({
  validateToolArgs: vi.fn(() => true),
  getTool: vi.fn(),
  listTools: vi.fn(() => []),
}));

vi.mock("../security/toolSandbox", () => ({
  executeRegisteredSandboxedTool: vi.fn(async () => ({ ok: true })),
}));

describe("toolExecutor governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects execution when max tool calls per request is exceeded", async () => {
    await expect(
      executeTool({
        toolName: "searchLibraryResources",
        input: { query: "catalog" },
        context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
        governance: {
          callCount: SECURITY_CONFIG.toolSandbox.maxCallsPerRequest,
          activeToolNames: new Set<string>(),
        },
      })
    ).rejects.toThrow("Maximum tool calls exceeded");
  });

  it("rejects recursive tool execution", async () => {
    await expect(
      executeTool({
        toolName: "searchLibraryResources",
        input: { query: "catalog" },
        context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
        governance: {
          callCount: 0,
          activeToolNames: new Set<string>(["searchLibraryResources"]),
        },
      })
    ).rejects.toThrow("Recursive tool execution is not allowed");
  });
});
