import { describe, expect, it, vi, beforeEach } from "vitest";
import { catalogTools } from "./catalogTool";

vi.mock("../services/catalogSearch", () => ({
  searchCatalogDirect: vi.fn(),
}));

import { searchCatalogDirect } from "../services/catalogSearch";

const mockSearchCatalogDirect = vi.mocked(searchCatalogDirect);

const searchCatalogTool = catalogTools.find(t => t.name === "searchCatalog")!;

describe("catalogTool — searchCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is registered with correct name and description", () => {
    expect(searchCatalogTool).toBeDefined();
    expect(searchCatalogTool.name).toBe("searchCatalog");
    expect(searchCatalogTool.description).toMatch(/catalog/i);
  });

  it("returns successful results from searchCatalogDirect", async () => {
    const mockResult = {
      ok: true,
      results: [
        {
          title: "Українська культура",
          author: "Іван Франко",
          year: "2020",
          url: "https://library-service.com.ua:8443/khkhdak/doc/1",
        },
      ],
      search_url:
        "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm?author=%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D0%BE",
    };
    mockSearchCatalogDirect.mockResolvedValueOnce(mockResult);

    const result = await searchCatalogTool.execute({ author: "Франко" });

    expect(mockSearchCatalogDirect).toHaveBeenCalledWith({
      author: "Франко",
      title: undefined,
      topic: undefined,
    });
    expect(result).toEqual(mockResult);
  });

  it("returns ok:false fallback when searchCatalogDirect throws", async () => {
    mockSearchCatalogDirect.mockRejectedValueOnce(new Error("network error"));

    const result = await searchCatalogTool.execute({ title: "Театр" });

    expect(result).toMatchObject({
      ok: false,
      results: [],
      fallback: expect.arrayContaining([
        expect.objectContaining({ label: "Відкрити каталог" }),
      ]),
    });
  });

  it("passes only author when title and topic are absent", async () => {
    mockSearchCatalogDirect.mockResolvedValueOnce({
      ok: true,
      results: [],
      search_url: "",
    });

    await searchCatalogTool.execute({ author: "Шевченко" });

    expect(mockSearchCatalogDirect).toHaveBeenCalledWith({
      author: "Шевченко",
      title: undefined,
      topic: undefined,
    });
  });

  it("passes only title when author and topic are absent", async () => {
    mockSearchCatalogDirect.mockResolvedValueOnce({
      ok: true,
      results: [],
      search_url: "",
    });

    await searchCatalogTool.execute({ title: "Музика" });

    expect(mockSearchCatalogDirect).toHaveBeenCalledWith({
      author: undefined,
      title: "Музика",
      topic: undefined,
    });
  });

  it("passes only topic when author and title are absent", async () => {
    mockSearchCatalogDirect.mockResolvedValueOnce({
      ok: true,
      results: [],
      search_url: "",
    });

    await searchCatalogTool.execute({ topic: "хореографія" });

    expect(mockSearchCatalogDirect).toHaveBeenCalledWith({
      author: undefined,
      title: undefined,
      topic: "хореографія",
    });
  });

  it("validates schema — rejects non-string author", () => {
    const valid = searchCatalogTool.schema.safeParse({ author: "Шевченко" });
    expect(valid.success).toBe(true);

    const invalid = searchCatalogTool.schema.safeParse({ author: 123 });
    expect(invalid.success).toBe(false);
  });
});
