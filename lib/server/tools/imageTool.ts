import { z } from "zod/v4";
import { generateImage } from "../providers/imageProvider";
import type { ToolRegistryEntry } from "./registry";

const imageGenerationSchema = z.object({
  prompt: z.string().min(1),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const imageTools = [
  {
    name: "imageGeneration",
    description: "Generate an image from text prompt.",
    schema: imageGenerationSchema,
    inputSchema: z.object({
      prompt: z.string().describe("Image generation prompt"),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    execute: async input => generateImage(input),
  } satisfies ToolRegistryEntry<typeof imageGenerationSchema>,
] as ToolRegistryEntry[];
