import { beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "./voiceTranscription";
import {
  fetchWithSecurity,
  validateExternalUrl,
} from "../services/security/safeRequest";

vi.mock("./env", () => ({
  ENV: {
    forgeApiUrl: "https://forge.example",
    forgeApiKey: "test-key",
  },
}));

vi.mock("../services/security/safeRequest", () => ({
  fetchWithSecurity: vi.fn(),
  validateExternalUrl: vi.fn(),
}));

describe("voiceTranscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects oversized audio via content-length header before buffering", async () => {
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(8));
    vi.mocked(validateExternalUrl).mockImplementation(
      () => new URL("https://file.example/audio.mp3")
    );
    vi.mocked(fetchWithSecurity).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) =>
          name === "content-length" ? String(17 * 1024 * 1024) : "audio/mpeg",
      },
      arrayBuffer,
    } as unknown as Response);

    const result = await transcribeAudio({
      audioUrl: "https://file.example/audio.mp3",
    });

    expect("code" in result && result.code).toBe("FILE_TOO_LARGE");
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});
