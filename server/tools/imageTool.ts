import { z } from "zod/v4";
import { generateImage } from "../providers/imageProvider";
import type { ToolRegistryEntry } from "./registry";

export const imageTools: ToolRegistryEntry[] = [
  {
    name: "imageGeneration",
    description: "Generate an image from text prompt.",
    schema: z.object({
      prompt: z.string().min(1),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    inputSchema: z.object({
      prompt: z.string().describe("Image generation prompt"),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    execute: async input => generateImage(input as any),
  },
];
