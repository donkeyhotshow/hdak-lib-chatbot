import { tool } from "ai";
import { SECURITY_CONFIG } from "../config/security";
import { executeRegisteredSandboxedTool } from "../security/toolSandbox";
import {
  getTool,
  listTools,
  validateToolArgs,
  type ToolExecutionContext,
} from "../tools/registry";

const CHAT_TOOL_NAMES = [
  "searchLibraryResources",
  "getCatalogSearchLink",
  "findUpcomingLibraryEvents",
] as const;

type ToolExecutionGovernance = {
  callCount: number;
  activeToolNames: Set<string>;
};

export async function executeTool(options: {
  toolName: string;
  input: unknown;
  context: ToolExecutionContext;
  governance?: ToolExecutionGovernance;
}) {
  if (options.governance) {
    if (
      options.governance.callCount >=
      SECURITY_CONFIG.toolSandbox.maxCallsPerRequest
    ) {
      throw new Error("Maximum tool calls exceeded");
    }
    if (options.governance.activeToolNames.has(options.toolName)) {
      throw new Error(
        `Recursive tool execution is not allowed: ${options.toolName}`
      );
    }
  }

  if (!validateToolArgs(options.toolName, options.input)) {
    throw new Error(`Invalid parameters for tool \"${options.toolName}\"`);
  }

  options.governance?.activeToolNames.add(options.toolName);
  options.governance && (options.governance.callCount += 1);
  try {
    return await executeRegisteredSandboxedTool({
      toolName: options.toolName,
      input: options.input,
      context: options.context,
    });
  } finally {
    options.governance?.activeToolNames.delete(options.toolName);
  }
}

export function buildAiTools(context: ToolExecutionContext) {
  const governance: ToolExecutionGovernance = {
    callCount: 0,
    activeToolNames: new Set<string>(),
  };
  const tools = Object.fromEntries(
    CHAT_TOOL_NAMES.map(name => {
      const definition = getTool(name);
      if (!definition) {
        throw new Error(`Tool not found in registry: ${name}`);
      }
      if (!definition.inputSchema) {
        throw new Error(`Tool is missing input schema: ${name}`);
      }
      return [
        name,
        tool({
          description: definition.description,
          inputSchema: definition.inputSchema,
          execute: input =>
            executeTool({ toolName: name, input, context, governance }),
        }),
      ];
    })
  );
  return tools;
}

export function buildLegacyTools(context: ToolExecutionContext) {
  return Object.fromEntries(
    CHAT_TOOL_NAMES.map(name => [
      name,
      {
        execute: (input: unknown) =>
          executeTool({ toolName: name, input, context }),
      },
    ])
  );
}

export { listTools };
