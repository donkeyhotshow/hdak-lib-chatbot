import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECURITY_CONFIG } from "../config/security";
import { buildAiTools, buildLegacyTools, executeTool } from "./toolExecutor";

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

  it("executes successfully without governance object", async () => {
    const { executeRegisteredSandboxedTool } =
      await import("../security/toolSandbox");
    const { validateToolArgs } = await import("../tools/registry");
    vi.mocked(validateToolArgs).mockReturnValue(true);
    vi.mocked(executeRegisteredSandboxedTool).mockResolvedValue({ ok: true });

    const result = await executeTool({
      toolName: "searchLibraryResources",
      input: { query: "test" },
      context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects when validateToolArgs returns false", async () => {
    const { validateToolArgs } = await import("../tools/registry");
    vi.mocked(validateToolArgs).mockReturnValue(false);

    await expect(
      executeTool({
        toolName: "searchLibraryResources",
        input: {},
        context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
      })
    ).rejects.toThrow("Invalid parameters");
  });

  it("increments callCount and tracks active tools during execution", async () => {
    const { executeRegisteredSandboxedTool } =
      await import("../security/toolSandbox");
    const { validateToolArgs } = await import("../tools/registry");
    vi.mocked(validateToolArgs).mockReturnValue(true);
    vi.mocked(executeRegisteredSandboxedTool).mockResolvedValue({
      result: "ok",
    });

    const governance = {
      callCount: 0,
      activeToolNames: new Set<string>(),
    };
    await executeTool({
      toolName: "searchLibraryResources",
      input: { query: "test" },
      context: { endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 },
      governance,
    });
    expect(governance.callCount).toBe(1);
    // Tool name should be removed after execution finishes
    expect(governance.activeToolNames.has("searchLibraryResources")).toBe(
      false
    );
  });
});

describe("buildAiTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when a tool is not found in the registry", async () => {
    const { getTool } = await import("../tools/registry");
    vi.mocked(getTool).mockReturnValue(undefined);

    expect(() =>
      buildAiTools({ endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 })
    ).toThrow("Tool not found in registry");
  });

  it("throws when a tool has no inputSchema", async () => {
    const { getTool } = await import("../tools/registry");
    vi.mocked(getTool).mockReturnValue({
      name: "searchLibraryResources",
      description: "Search",
      inputSchema: undefined,
      execute: vi.fn(),
    });

    expect(() =>
      buildAiTools({ endpoint: "/api/chat", ip: "1.1.1.1", userId: 1 })
    ).toThrow("Tool is missing input schema");
  });
});

describe("buildLegacyTools", () => {
  it("returns an object with execute functions for each tool", () => {
    const tools = buildLegacyTools({
      endpoint: "/api/chat",
      ip: "1.1.1.1",
      userId: 1,
    });
    expect(typeof tools).toBe("object");
    for (const [, def] of Object.entries(tools)) {
      expect(typeof (def as { execute: unknown }).execute).toBe("function");
    }
  });
});
