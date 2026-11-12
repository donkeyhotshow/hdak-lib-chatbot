import { describe, expect, it } from "vitest";
import { buildDspaceContext, getDspaceStatus, searchDspace, syncDspace } from "@/lib/dspace";

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
});
