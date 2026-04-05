/**
 * Lightweight A/B testing utility.
 * Variants are assigned deterministically from a userId hash so that
 * the same user always sees the same variant within a session.
 */

export type AbVariant = "A" | "B";

export type AbVariantConfig = {
  chipsFirst: boolean;
  cardsHorizontal: boolean;
};

export const AB_VARIANTS: Record<AbVariant, AbVariantConfig> = {
  A: { chipsFirst: true, cardsHorizontal: false },
  B: { chipsFirst: false, cardsHorizontal: true },
};

/**
 * Returns an integer hash of a string (djb2-style, unsigned 32-bit).
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Returns the A/B variant for a given userId.
 * The assignment is deterministic: the same userId always maps to the same variant.
 */
export function getUserVariant(userId: string | null | undefined): AbVariant {
  if (!userId) return "A";
  return hashString(userId) % 2 === 0 ? "A" : "B";
}

/**
 * Returns the full config for a user's assigned variant.
 */
export function getUserVariantConfig(
  userId: string | null | undefined
): AbVariantConfig {
  return AB_VARIANTS[getUserVariant(userId)];
}
