import { z } from "zod/v4";
import { makeRequest } from "../providers/mapProvider";
import type { ToolRegistryEntry } from "./registry";

const mapLookupSchema = z.object({
  endpoint: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const mapTools = [
  {
    name: "mapLookup",
    description: "Call maps proxy endpoint.",
    schema: mapLookupSchema,
    inputSchema: mapLookupSchema,
    execute: async ({ endpoint, params }) =>
      makeRequest(endpoint, params ?? {}),
  } satisfies ToolRegistryEntry<typeof mapLookupSchema>,
] as ToolRegistryEntry[];
