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
          startedAtMs: Date.now(),
          activeToolNames: new Set<string>(),
        },
      })
    ).rejects.toThrow("Maximum tool calls exceeded");
  });

  it("rejects execution when total execution budget is exceeded", async () => {
    await expect(
      executeTool({
        toolName: "searchLibraryResources",
        input: { query: "catalog" },
        context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
        governance: {
          callCount: 0,
          startedAtMs:
            Date.now() - SECURITY_CONFIG.toolSandbox.totalExecutionBudgetMs - 1,
          activeToolNames: new Set<string>(),
        },
      })
    ).rejects.toThrow("Tool execution budget exceeded");
  });

  it("rejects recursive tool execution", async () => {
    await expect(
      executeTool({
        toolName: "searchLibraryResources",
        input: { query: "catalog" },
        context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
        governance: {
          callCount: 0,
          startedAtMs: Date.now(),
          activeToolNames: new Set<string>(["searchLibraryResources"]),
        },
      })
    ).rejects.toThrow("Recursive tool execution is not allowed");
  });
});
