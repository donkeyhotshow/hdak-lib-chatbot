import { describe, expect, it } from "vitest";
import { AB_VARIANTS, getUserVariant, getUserVariantConfig } from "./abTesting";

describe("getUserVariant", () => {
  it("returns 'A' when userId is null", () => {
    expect(getUserVariant(null)).toBe("A");
  });

  it("returns 'A' when userId is undefined", () => {
    expect(getUserVariant(undefined)).toBe("A");
  });

  it("returns 'A' when userId is empty string", () => {
    expect(getUserVariant("")).toBe("A");
  });

  it("returns a deterministic result for the same userId", () => {
    const v1 = getUserVariant("user-123");
    const v2 = getUserVariant("user-123");
    expect(v1).toBe(v2);
  });

  it("returns either 'A' or 'B' for a non-empty userId", () => {
    const v = getUserVariant("some-user");
    expect(["A", "B"]).toContain(v);
  });

  it("can produce both 'A' and 'B' across different userIds", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 20; i++) {
      variants.add(getUserVariant(`user-${i}`));
    }
    expect(variants.size).toBe(2);
  });
});

describe("getUserVariantConfig", () => {
  it("returns the A config for null userId", () => {
    const config = getUserVariantConfig(null);
    expect(config).toEqual(AB_VARIANTS.A);
  });

  it("returns the B config when variant is B", () => {
    // Find a userId that maps to B
    let bUserId: string | undefined;
    for (let i = 0; i < 100; i++) {
      if (getUserVariant(`u${i}`) === "B") {
        bUserId = `u${i}`;
        break;
      }
    }
    if (bUserId) {
      expect(getUserVariantConfig(bUserId)).toEqual(AB_VARIANTS.B);
    }
  });

  it("config has chipsFirst and cardsHorizontal booleans", () => {
    const config = getUserVariantConfig("test-user");
    expect(typeof config.chipsFirst).toBe("boolean");
    expect(typeof config.cardsHorizontal).toBe("boolean");
  });
});
