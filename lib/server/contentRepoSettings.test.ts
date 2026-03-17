import { describe, expect, it } from "vitest";
import {
  applyStarsLimit,
  getStarsLimitFromSettings,
} from "../../content-repo.js";

describe("content-repo stars limit settings", () => {
  it("uses explicit settings override", () => {
    const items = [{ stars: 50 }, { stars: 150 }];
    const filtered = applyStarsLimit(items, { starsLimit: 100 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].stars).toBe(150);
  });

  it("falls back to GITHUB_STARS_LIMIT from env", () => {
    process.env.GITHUB_STARS_LIMIT = "200";
    expect(getStarsLimitFromSettings()).toBe(200);
    delete process.env.GITHUB_STARS_LIMIT;
  });
});
