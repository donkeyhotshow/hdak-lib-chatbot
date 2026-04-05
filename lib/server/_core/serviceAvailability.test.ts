import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["SERVICES_ENABLED", "SERVICE_VOICE_ENABLED"] as const;
const originalValues = new Map<string, string | undefined>(
  ENV_KEYS.map(key => [key, process.env[key]])
);

async function importServiceAvailabilityModule() {
  vi.resetModules();
  return import("./serviceAvailability");
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalValues.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe("serviceAvailability", () => {
  it("inherits global SERVICES_ENABLED when service override is unset", async () => {
    process.env.SERVICES_ENABLED = "false";
    delete process.env.SERVICE_VOICE_ENABLED;

    const { isServiceEnabled } = await importServiceAvailabilityModule();

    expect(isServiceEnabled("voice")).toBe(false);
  });

  it("allows per-service override over global setting", async () => {
    process.env.SERVICES_ENABLED = "false";
    process.env.SERVICE_VOICE_ENABLED = "true";

    const { isServiceEnabled } = await importServiceAvailabilityModule();

    expect(isServiceEnabled("voice")).toBe(true);
  });
});
