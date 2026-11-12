import type { SearchResult } from "@/lib/catalog-search";
import { parseBooksFromHtml } from "@/lib/catalog-search";
import { logger } from "@/lib/logger";

type PuppeteerPage = {
  goto: (
    url: string,
    options: { waitUntil: "domcontentloaded"; timeout: number }
  ) => Promise<unknown>;
  evaluate: <T>(
    fn: (value: { term: string; type: string; size: number }) => T,
    value: { term: string; type: string; size: number }
  ) => Promise<T>;
  waitForNavigation: (options: {
    waitUntil: "domcontentloaded";
    timeout: number;
  }) => Promise<unknown>;
  content: () => Promise<string>;
};

type PuppeteerBrowser = {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
};

type PuppeteerModule = {
  launch: (options: {
    headless: boolean;
    args: string[];
  }) => Promise<PuppeteerBrowser>;
};

/**
 * Browser fallback for catalogs that require JavaScript or a server session.
 * It is opt-in because serverless deployments do not always ship Chromium.
 */
export async function searchCatalogWithPuppeteer(
  formUrl: string,
  _searchUrl: string,
  term: string,
  searchType: string,
  pageSize: number
): Promise<SearchResult> {
  try {
    const load = new Function(
      "specifier",
      "return import(specifier)"
    ) as (specifier: string) => Promise<{
      default?: PuppeteerModule;
      launch?: PuppeteerModule["launch"];
    }>;
    const loadedModule = await load("puppeteer");
    const launch = loadedModule.default?.launch ?? loadedModule.launch;
    if (!launch) throw new Error("Puppeteer launch is unavailable");

    const browser = await launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.goto(formUrl, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await page.evaluate(
        ({ term: value, type, size }) => {
          const form = document.querySelector("form") as HTMLFormElement | null;
          if (!form) return;
          const field =
            type === "author"
              ? "author"
              : type === "subject"
                ? "subject"
                : type === "keyword"
                  ? "keywords"
                  : "name_value";
          const input = form.querySelector(
            `[name="${field}"]`
          ) as HTMLInputElement | null;
          if (input) input.value = value;
          const sizeInput = form.querySelector(
            '[name="page_size"]'
          ) as HTMLInputElement | null;
          if (sizeInput) sizeInput.value = String(size);
          form.submit();
        },
        { term, type: searchType, size: pageSize }
      );
      await page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 })
        .catch(() => undefined);
      const html = await page.content();
      return parseBooksFromHtml(html, pageSize);
    } finally {
      await browser.close();
    }
  } catch (error) {
    logger.warn(
      "Puppeteer catalog fallback unavailable or failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return { books: [], total: 0, unavailable: true };
  }
}
