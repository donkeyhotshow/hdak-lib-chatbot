import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getCachedAllResources,
  getCachedSearchResources,
  getCachedAllContacts,
  getCachedLibraryInfo,
  getCachedAllLibraryInfo,
  invalidateResourceCache,
  invalidateContactCache,
  invalidateInfoCache,
  clearAllLibraryCaches,
} from "./libraryCache";
import * as db from "../db";

vi.mock("../db", () => ({
  getAllResources: vi.fn(),
  searchResources: vi.fn(),
  getAllContacts: vi.fn(),
  getLibraryInfo: vi.fn(),
  getAllLibraryInfo: vi.fn(),
}));

const mockResource = {
  id: 1,
  nameEn: "Test Resource",
  nameUk: "Тест",
  nameRu: "Тест",
  descriptionEn: "desc",
  descriptionUk: "desc",
  descriptionRu: "desc",
  type: "database" as const,
  url: "https://example.com",
  keywords: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContact = {
  id: 1,
  type: "email" as const,
  value: "test@example.com",
  labelEn: "Email",
  labelUk: "Імейл",
  labelRu: "Email",
  createdAt: new Date(),
};

const mockInfo = {
  id: 1,
  key: "hours",
  valueEn: "9-18",
  valueUk: "9-18",
  valueRu: "9-18",
  createdAt: new Date(),
};

afterEach(() => {
  clearAllLibraryCaches();
  vi.restoreAllMocks();
});

describe("libraryCache — resources", () => {
  it("calls db.getAllResources once and serves subsequent calls from cache", async () => {
    (db.getAllResources as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockResource,
    ]);

    const first = await getCachedAllResources();
    const second = await getCachedAllResources();

    expect(first).toEqual([mockResource]);
    expect(second).toEqual([mockResource]);
    expect(db.getAllResources).toHaveBeenCalledTimes(1);
  });

  it("calls db.searchResources once per unique query, caches per query", async () => {
    (db.searchResources as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockResource,
    ]);

    await getCachedSearchResources("library");
    await getCachedSearchResources("library");
    await getCachedSearchResources("catalog");

    expect(db.searchResources).toHaveBeenCalledTimes(2);
    expect(db.searchResources).toHaveBeenCalledWith("library");
    expect(db.searchResources).toHaveBeenCalledWith("catalog");
  });

  it("invalidateResourceCache forces fresh fetch on next call", async () => {
    (db.getAllResources as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockResource,
    ]);

    await getCachedAllResources();
    invalidateResourceCache();
    await getCachedAllResources();

    expect(db.getAllResources).toHaveBeenCalledTimes(2);
  });
});

describe("libraryCache — contacts", () => {
  it("calls db.getAllContacts once and serves subsequent calls from cache", async () => {
    (db.getAllContacts as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockContact,
    ]);

    await getCachedAllContacts();
    await getCachedAllContacts();

    expect(db.getAllContacts).toHaveBeenCalledTimes(1);
  });

  it("invalidateContactCache forces fresh fetch on next call", async () => {
    (db.getAllContacts as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockContact,
    ]);

    await getCachedAllContacts();
    invalidateContactCache();
    await getCachedAllContacts();

    expect(db.getAllContacts).toHaveBeenCalledTimes(2);
  });
});

describe("libraryCache — libraryInfo", () => {
  it("calls db.getLibraryInfo once per key and caches result", async () => {
    (db.getLibraryInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockInfo);

    await getCachedLibraryInfo("hours");
    await getCachedLibraryInfo("hours");
    await getCachedLibraryInfo("address");

    expect(db.getLibraryInfo).toHaveBeenCalledTimes(2);
  });

  it("caches null when key has no associated entry", async () => {
    (db.getLibraryInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getCachedLibraryInfo("nonexistent");
    await getCachedLibraryInfo("nonexistent");

    expect(result).toBeNull();
    expect(db.getLibraryInfo).toHaveBeenCalledTimes(1);
  });

  it("calls db.getAllLibraryInfo once and caches the result", async () => {
    (db.getAllLibraryInfo as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockInfo,
    ]);

    await getCachedAllLibraryInfo();
    await getCachedAllLibraryInfo();

    expect(db.getAllLibraryInfo).toHaveBeenCalledTimes(1);
  });

  it("invalidateInfoCache forces fresh fetch on next call", async () => {
    (db.getAllLibraryInfo as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockInfo,
    ]);

    await getCachedAllLibraryInfo();
    invalidateInfoCache();
    await getCachedAllLibraryInfo();

    expect(db.getAllLibraryInfo).toHaveBeenCalledTimes(2);
  });
});
