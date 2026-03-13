import { z } from "zod/v4";
import { transcribeAudio } from "../providers/voiceProvider";
import type { ToolRegistryEntry } from "./registry";

export const voiceTools: ToolRegistryEntry[] = [
  {
    name: "voiceTranscription",
    description: "Transcribe audio from URL.",
    schema: z.object({
      audioUrl: z.string().url(),
      language: z.string().optional(),
      prompt: z.string().optional(),
    }),
    inputSchema: z.object({
      audioUrl: z.string().url().describe("Public audio URL to transcribe"),
      language: z.string().optional(),
      prompt: z.string().optional(),
    }),
    execute: async input => transcribeAudio(input as any),
  },
];
