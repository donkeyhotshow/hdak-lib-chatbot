import type { ZodTypeAny } from "zod";
import { dataTools } from "./dataTool";
import { imageTools } from "./imageTool";
import { mapTools } from "./mapTool";
import { voiceTools } from "./voiceTool";

export type ToolExecutionContext = {
  endpoint: string;
  userId?: number | null;
  ip?: string | null;
};

export type ToolRegistryEntry = {
  name: string;
  description: string;
  schema: ZodTypeAny;
  inputSchema?: ZodTypeAny;
  execute: (input: any, context: ToolExecutionContext) => Promise<unknown>;
};

const toolEntries: ToolRegistryEntry[] = [
  ...dataTools,
  ...imageTools,
  ...voiceTools,
  ...mapTools,
];

const toolRegistry = new Map(toolEntries.map(entry => [entry.name, entry]));

export function getTool(name: string): ToolRegistryEntry | undefined {
  return toolRegistry.get(name);
}

export function listTools(): string[] {
  return Array.from(toolRegistry.keys());
}

export function validateToolArgs(name: string, args: unknown): boolean {
  const tool = getTool(name);
  if (!tool) return false;
  return tool.schema.safeParse(args).success;
}
