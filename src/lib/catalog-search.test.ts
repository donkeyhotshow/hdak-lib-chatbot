import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBooksFromHtml, searchCatalog } from "@/lib/catalog-search";

const bookHtml = `
  <html><body>
    <div>1 - 1 з 1</div>
    <table><tr><td width="80%">
      Шевченко Т. Г., Кобзар / Т. Г. Шевченко, Київ : Веселка, 2018.
    </td></tr></table>
  </body></html>
`;

describe("catalog search", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CATALOG_URL;
    delete process.env.CATALOG_FORM_URL;
  });

  it("parses a fixture book and total count", () => {
    expect(parseBooksFromHtml(bookHtml)).toEqual({
      books: [
        expect.objectContaining({
          title: "Шевченко Т. Г., Кобзар",
          year: "2018",
          hasFile: false,
        }),
      ],
      total: 1,
      unavailable: false,
    });
  });

  it("distinguishes an empty catalog result from an unavailable response", () => {
    expect(parseBooksFromHtml("<html>DocumentSearchResult</html>")).toEqual({
      books: [],
      total: 0,
      unavailable: false,
    });
    expect(parseBooksFromHtml("<html>connection failed</html>")).toEqual({
      books: [],
      total: 0,
      unavailable: true,
    });
  });

  it("uses the public fallback endpoint when CATALOG_URL is unset", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_input, init) =>
        init?.method === "GET"
          ? new Response("<form />", {
              status: 200,
              headers: { "set-cookie": "JSESSIONID=test-session; Path=/" },
            })
          : new Response(bookHtml, { status: 200 })
      );
    delete process.env.CATALOG_URL;

    const result = await searchCatalog("Шевченко", "general", 10, 1);

    expect(result.books).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://library-service.com.ua:8443/khkhdak/DocumentSearchResult",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: "JSESSIONID=test-session",
        },
        body: expect.stringContaining(
          "name_value=%D0%A8%D0%B5%D0%B2%D1%87%D0%B5%D0%BD%D0%BA%D0%BE"
        ),
      })
    );
  });

  it("falls back when a catalog env value is malformed", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_input, init) =>
        init?.method === "GET"
          ? new Response("<form />", { status: 200 })
          : new Response(bookHtml, { status: 200 })
      );
    process.env.CATALOG_FORM_URL =
      "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm. invalid";
    delete process.env.CATALOG_URL;

    await searchCatalog("Шевченко", "general");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
    );
  });

  it("returns unavailable after a timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("The operation timed out", "TimeoutError")
    );

    await expect(searchCatalog("Шевченко", "author")).resolves.toEqual({
      books: [],
      total: 0,
      unavailable: true,
    });
  });

  it("returns unavailable for an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream error", { status: 503 })
    );

    await expect(searchCatalog("Шевченко", "author")).resolves.toEqual({
      books: [],
      total: 0,
      unavailable: true,
    });
  });
});
