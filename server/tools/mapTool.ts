import { z } from "zod/v4";
import { makeRequest } from "../providers/mapProvider";
import type { ToolRegistryEntry } from "./registry";

export const mapTools: ToolRegistryEntry[] = [
  {
    name: "mapLookup",
    description: "Call maps proxy endpoint.",
    schema: z.object({
      endpoint: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
    inputSchema: z.object({
      endpoint: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
    execute: async ({ endpoint, params }) =>
      makeRequest(endpoint, params ?? {}),
  },
];
