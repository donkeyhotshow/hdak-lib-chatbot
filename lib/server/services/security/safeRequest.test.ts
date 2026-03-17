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

  it("rejects URLs with embedded credentials", () => {
    expect(() =>
      validateExternalUrl("https://user:pass@example.com/file.mp3")
    ).toThrow("Credentials in URL are not allowed");
  });

  it("rejects invalid hostnames and encoded control chars", () => {
    expect(() => validateExternalUrl("https://-bad.example.com")).toThrow(
      "Invalid hostname"
    );
    expect(() =>
      validateExternalUrl("https://example.com/path%0Ainject")
    ).toThrow("URL contains forbidden encoded characters");
  });
});
