import { describe, expect, it } from "vitest";
import { validateExternalUrl } from "./safeRequest";

describe("safeRequest", () => {
  it("rejects localhost URLs", () => {
    expect(() => validateExternalUrl("http://localhost:3000/file.mp3")).toThrow(
      "Private or loopback hosts are not allowed"
    );
  });

  it("accepts normal https URL", () => {
    const parsed = validateExternalUrl("https://example.com/file.mp3");
    expect(parsed.hostname).toBe("example.com");
  });
});
