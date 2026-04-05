import { z } from "zod/v4";
import { transcribeAudio } from "../providers/voiceProvider";
import type { ToolRegistryEntry } from "./registry";

const voiceTranscriptionSchema = z.object({
  audioUrl: z.string().url(),
  language: z.string().optional(),
  prompt: z.string().optional(),
});

export const voiceTools = [
  {
    name: "voiceTranscription",
    description: "Transcribe audio from URL.",
    schema: voiceTranscriptionSchema,
    inputSchema: voiceTranscriptionSchema,
    execute: async input => transcribeAudio(input),
  } satisfies ToolRegistryEntry<typeof voiceTranscriptionSchema>,
] as ToolRegistryEntry[];
