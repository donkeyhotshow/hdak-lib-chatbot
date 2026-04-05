import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home resources menu links", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("keeps only the approved five links in the resources menu list", () => {
    const resourcesBlockMatch = homePageContent.match(
      /export const RESOURCES = \[(.*?)\];/s
    );
    expect(resourcesBlockMatch).toBeTruthy();

    const resourcesBlock = resourcesBlockMatch?.[1] ?? "";
    const urls = Array.from(
      resourcesBlock.matchAll(/url:\s*"([^"]+)"/g),
      match => match[1]
    );

    expect(urls).toEqual([
      "https://lib-hdak.in.ua/e-catalog.html",
      "https://lib-hdak.in.ua/site-map.html",
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
      "https://lib-hdak.in.ua/",
    ]);
  });
});
