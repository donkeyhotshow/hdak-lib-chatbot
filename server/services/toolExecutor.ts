import { tool } from "ai";
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

export async function executeTool(options: {
  toolName: string;
  input: unknown;
  context: ToolExecutionContext;
}) {
  if (!validateToolArgs(options.toolName, options.input)) {
    throw new Error(`Invalid parameters for tool \"${options.toolName}\"`);
  }
  return executeRegisteredSandboxedTool({
    toolName: options.toolName,
    input: options.input,
    context: options.context,
  });
}

export function buildAiTools(context: ToolExecutionContext) {
  const tools = Object.fromEntries(
    CHAT_TOOL_NAMES.map(name => {
      const definition = getTool(name);
      if (!definition?.inputSchema) {
        throw new Error(`Missing tool definition for ${name}`);
      }
      return [
        name,
        tool({
          description: definition.description,
          inputSchema: definition.inputSchema,
          execute: input => executeTool({ toolName: name, input, context }),
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
