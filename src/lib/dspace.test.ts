import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDspaceContext, getDspaceStatus, searchDspace, syncDspace } from "@/lib/dspace";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DSPACE_OAI_URL;
  delete process.env.DSPACE_SYNC_MAX_ITEMS;
});

describe("DSpace sync flow", () => {
  it("syncs mock records and exposes them to chat context", async () => {
    const status = await syncDspace("mock");
    expect(status.status).toBe("ok");
    expect(status.itemCount).toBeGreaterThan(0);
    expect(getDspaceStatus().mode).toBe("mock");

    const results = searchDspace("цифрові технології культура");
    expect(results[0]?.title).toContain("Цифрові технології");

    const context = buildDspaceContext("цифрові технології");
    expect(context).toContain("РЕПОЗИТАРІЙ ХДАК / DSpace");
    expect(context).toContain("repository.ac.kharkov.ua");
  });

  it("harvests paginated OAI-PMH records and normalizes metadata", async () => {
    process.env.DSPACE_OAI_URL = "https://repository.example/oai";
    process.env.DSPACE_SYNC_MAX_ITEMS = "10";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(`<?xml version="1.0"?><OAI-PMH><ListRecords><record><metadata><oai_dc:dc><dc:title>Перша &amp; друга праця</dc:title><dc:creator>Автор, А. А.</dc:creator><dc:date>2024</dc:date><dc:identifier>123/1</dc:identifier></oai_dc:dc></metadata></record><resumptionToken>next-page</resumptionToken></ListRecords></OAI-PMH>`))
      .mockResolvedValueOnce(new Response(`<?xml version="1.0"?><OAI-PMH><ListRecords><record><metadata><oai_dc:dc><dc:title>Друга праця</dc:title><dc:description>Опис матеріалу</dc:description><dc:identifier>https://repository.example/item/2</dc:identifier></oai_dc:dc></metadata></record><resumptionToken></resumptionToken></ListRecords></OAI-PMH>`));
    vi.stubGlobal("fetch", fetchMock);

    const status = await syncDspace("oai-pmh");

    expect(status.status).toBe("ok");
    expect(status.itemCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(searchDspace("перша друга")[0]?.title).toContain("Перша & друга");
    expect(searchDspace("опис матеріалу")[0]?.url).toBe("https://repository.example/item/2");
  });

  it("reports missing live endpoint without discarding the previous index", async () => {
    await syncDspace("mock");
    delete process.env.DSPACE_API_URL;

    const status = await syncDspace("rest");

    expect(status.status).toBe("error");
    expect(status.itemCount).toBeGreaterThan(0);
    expect(status.error).toContain("DSPACE_API_URL");
    expect(searchDspace("цифрові технології")).not.toHaveLength(0);
  });
});
