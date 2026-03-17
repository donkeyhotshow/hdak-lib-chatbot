/**
 * Tests for admin-only tRPC router procedures:
 * resources, contacts, libraryInfo, analytics, sync
 *
 * All DB interactions are mocked so the tests run without a live database.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as syncService from "./services/syncService";
import {
  clearChatAnalyticsEvents,
  listChatAnalyticsEvents,
} from "./services/chatAnalytics";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

vi.mock("./services/syncService", async importOriginal => {
  const actual =
    await importOriginal<typeof import("./services/syncService")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeUser(role: "user" | "admin" = "admin"): AuthUser {
  return {
    id: 1,
    openId: "admin-open-id",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role,
    language: "uk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeCtx(role: "user" | "admin" = "admin"): TrpcContext {
  return {
    user: makeUser(role),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  clearChatAnalyticsEvents();
});

// ---------------------------------------------------------------------------
// resources router
// ---------------------------------------------------------------------------

const mockResource = {
  id: 1,
  nameEn: "Test Resource",
  nameUk: "Тестовий ресурс",
  nameRu: "Тестовый ресурс",
  descriptionEn: null,
  descriptionUk: null,
  descriptionRu: null,
  type: "other" as const,
  url: null,
  keywords: null,
  accessConditions: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("resources.getAll — public procedure", () => {
  it("returns all resources", async () => {
    vi.spyOn(db, "getAllResources").mockResolvedValueOnce([mockResource]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.resources.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].nameEn).toBe("Test Resource");
  });
});

describe("resources.search — public procedure", () => {
  it("returns matching resources", async () => {
    vi.spyOn(db, "searchResources").mockResolvedValueOnce([mockResource]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.resources.search({ query: "catalog" });
    expect(result).toHaveLength(1);
    expect(db.searchResources).toHaveBeenCalledWith("catalog");
  });

  it("rejects queries longer than 500 chars", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.resources.search({ query: "x".repeat(501) })
    ).rejects.toBeDefined();
  });
});

describe("resources.getByType — public procedure", () => {
  it("returns resources filtered by type", async () => {
    vi.spyOn(db, "getResourcesByType").mockResolvedValueOnce([mockResource]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.resources.getByType({ type: "database" });
    expect(result).toHaveLength(1);
    expect(db.getResourcesByType).toHaveBeenCalledWith("database");
  });

  it("rejects unknown type values", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.resources.getByType({ type: "invalid" as never })
    ).rejects.toBeDefined();
  });
});

describe("resources.getSiteResources — public procedure", () => {
  it("returns the hard-coded HDAK site resources array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.resources.getSiteResources();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("resources.create — admin procedure", () => {
  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.resources.create({
        nameEn: "X",
        nameUk: "X",
        nameRu: "X",
        type: "other",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates and returns a new resource", async () => {
    vi.spyOn(db, "createResource").mockResolvedValueOnce(mockResource);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.resources.create({
      nameEn: "Test Resource",
      nameUk: "Тестовий ресурс",
      nameRu: "Тестовый ресурс",
      type: "other",
    });
    expect(result.id).toBe(1);
  });

  it("throws INTERNAL_SERVER_ERROR when db.createResource returns null", async () => {
    vi.spyOn(db, "createResource").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.resources.create({
        nameEn: "X",
        nameUk: "X",
        nameRu: "X",
        type: "other",
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("resources.update — admin procedure", () => {
  it("updates and returns the resource", async () => {
    vi.spyOn(db, "updateResource").mockResolvedValueOnce({
      ...mockResource,
      nameEn: "Updated",
    });
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.resources.update({ id: 1, nameEn: "Updated" });
    expect(result.nameEn).toBe("Updated");
  });

  it("throws NOT_FOUND when db.updateResource returns null", async () => {
    vi.spyOn(db, "updateResource").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.resources.update({ id: 999, nameEn: "X" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("resources.delete — admin procedure", () => {
  it("deletes successfully and returns { success: true }", async () => {
    vi.spyOn(db, "deleteResource").mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.resources.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("throws NOT_FOUND when the resource does not exist", async () => {
    vi.spyOn(db, "deleteResource").mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.resources.delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// contacts router
// ---------------------------------------------------------------------------

const mockContact = {
  id: 1,
  type: "email" as const,
  value: "test@hdak.edu.ua",
  labelEn: "Main email",
  labelUk: null,
  labelRu: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("contacts.getAll — public procedure", () => {
  it("returns all contacts", async () => {
    vi.spyOn(db, "getAllContacts").mockResolvedValueOnce([mockContact]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contacts.getAll();
    expect(result).toHaveLength(1);
  });
});

describe("contacts.create — admin procedure", () => {
  it("creates and returns a new contact", async () => {
    vi.spyOn(db, "createContact").mockResolvedValueOnce(mockContact);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.contacts.create({
      type: "email",
      value: "test@hdak.edu.ua",
    });
    expect(result.id).toBe(1);
  });

  it("throws INTERNAL_SERVER_ERROR when db.createContact returns null", async () => {
    vi.spyOn(db, "createContact").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.contacts.create({ type: "email", value: "x@y.com" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("throws FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.contacts.create({ type: "phone", value: "+380501234567" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("contacts.update — admin procedure", () => {
  it("updates and returns the contact", async () => {
    vi.spyOn(db, "updateContact").mockResolvedValueOnce({
      ...mockContact,
      value: "new@hdak.edu.ua",
    });
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.contacts.update({
      id: 1,
      value: "new@hdak.edu.ua",
    });
    expect(result.value).toBe("new@hdak.edu.ua");
  });

  it("throws NOT_FOUND when db.updateContact returns null", async () => {
    vi.spyOn(db, "updateContact").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.contacts.update({ id: 999, value: "x@y.com" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("contacts.delete — admin procedure", () => {
  it("deletes successfully", async () => {
    vi.spyOn(db, "deleteContact").mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.contacts.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("throws NOT_FOUND when contact doesn't exist", async () => {
    vi.spyOn(db, "deleteContact").mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.contacts.delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// libraryInfo router
// ---------------------------------------------------------------------------

const mockLibraryInfo = {
  id: 1,
  key: "address",
  valueEn: "Address in English",
  valueUk: "Адреса українською",
  valueRu: "Адрес на русском",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("libraryInfo.get — public procedure", () => {
  it("returns the library info entry for a key", async () => {
    vi.spyOn(db, "getLibraryInfo").mockResolvedValueOnce(mockLibraryInfo);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.libraryInfo.get({ key: "address" });
    expect(result?.key).toBe("address");
  });

  it("returns null when key does not exist", async () => {
    vi.spyOn(db, "getLibraryInfo").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.libraryInfo.get({ key: "nonexistent" });
    expect(result).toBeNull();
  });

  it("rejects keys longer than 200 characters", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.libraryInfo.get({ key: "k".repeat(201) })
    ).rejects.toBeDefined();
  });
});

describe("libraryInfo.getAll — admin procedure", () => {
  it("returns all library info entries", async () => {
    vi.spyOn(db, "getAllLibraryInfo").mockResolvedValueOnce([mockLibraryInfo]);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.libraryInfo.getAll();
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.libraryInfo.getAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("libraryInfo.set — admin procedure", () => {
  it("sets and returns the library info entry", async () => {
    vi.spyOn(db, "setLibraryInfo").mockResolvedValueOnce(mockLibraryInfo);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.libraryInfo.set({
      key: "address",
      valueEn: "Address in English",
      valueUk: "Адреса",
      valueRu: "Адрес",
    });
    expect(result.key).toBe("address");
  });

  it("throws INTERNAL_SERVER_ERROR when db.setLibraryInfo returns null", async () => {
    vi.spyOn(db, "setLibraryInfo").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.libraryInfo.set({
        key: "k",
        valueEn: "e",
        valueUk: "u",
        valueRu: "r",
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// analytics router
// ---------------------------------------------------------------------------

describe("analytics.getQueryStats — admin procedure", () => {
  it("returns query analytics with default limit", async () => {
    vi.spyOn(db, "getQueryAnalytics").mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.analytics.getQueryStats();
    expect(Array.isArray(result)).toBe(true);
    expect(db.getQueryAnalytics).toHaveBeenCalledWith(20);
  });

  it("passes custom limit to db.getQueryAnalytics", async () => {
    vi.spyOn(db, "getQueryAnalytics").mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx("admin"));
    await caller.analytics.getQueryStats({ limit: 50 });
    expect(db.getQueryAnalytics).toHaveBeenCalledWith(50);
  });

  it("rejects limit > 100", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.analytics.getQueryStats({ limit: 101 })
    ).rejects.toBeDefined();
  });
});

describe("analytics.getQualitySummary — admin procedure", () => {
  it("returns aggregated quality metrics from chat analytics events", async () => {
    const adminCaller = appRouter.createCaller(makeCtx("admin"));
    const guestCaller = appRouter.createCaller(makeGuestCtx());

    await guestCaller.analytics.submitFeedback({
      responseId: "r-1",
      sourceBadge: "catalog",
      userQuery: "де каталог",
      feedbackValue: "down",
      guestId: "g-1",
    });
    const summary = await adminCaller.analytics.getQualitySummary({
      topLimit: 5,
    });

    expect(summary.totalEvents).toBeGreaterThan(0);
    expect(summary.feedback.notUseful).toBe(1);
    expect(summary.feedback.negativeResponses.length).toBeGreaterThan(0);
  });
});

describe("analytics.submitFeedback — public procedure", () => {
  it("stores feedback event for guest mode", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const result = await caller.analytics.submitFeedback({
      responseId: "resp-guest-1",
      sourceBadge: "quick",
      userQuery: "як записатися",
      feedbackValue: "up",
      guestId: "guest-1",
    });

    expect(result.success).toBe(true);
    expect(
      listChatAnalyticsEvents().some(
        item =>
          item.name === "feedback_submitted" &&
          item.mode === "guest" &&
          item.metadata?.responseId === "resp-guest-1"
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sync router
// ---------------------------------------------------------------------------

describe("sync.runNow — admin procedure", () => {
  it("calls runSync and returns the result", async () => {
    vi.spyOn(syncService, "runSync").mockResolvedValueOnce({
      synced: 3,
      errors: [],
    });
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.sync.runNow();
    expect(result.synced).toBe(3);
    expect(syncService.runSync).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN for regular users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.sync.runNow()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("sync.status — admin procedure", () => {
  it("returns current sync status", async () => {
    vi.spyOn(syncService, "isSyncing").mockReturnValueOnce(false);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.sync.status();
    expect(result).toEqual({ isSyncing: false });
  });

  it("returns isSyncing=true when a sync is running", async () => {
    vi.spyOn(syncService, "isSyncing").mockReturnValueOnce(true);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.sync.status();
    expect(result.isSyncing).toBe(true);
  });
});

describe("sync.lastStatus — admin procedure", () => {
  it("returns null when no sync has run yet", async () => {
    vi.spyOn(syncService, "getLastSyncStatus").mockReturnValueOnce(null);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.sync.lastStatus();
    expect(result).toBeNull();
  });

  it("returns formatted status after a sync", async () => {
    const ts = new Date("2026-01-01T12:00:00Z");
    vi.spyOn(syncService, "getLastSyncStatus").mockReturnValueOnce({
      success: true,
      timestamp: ts,
      synced: 7,
      errors: [],
    });
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.sync.lastStatus();
    expect(result?.success).toBe(true);
    expect(result?.synced).toBe(7);
    expect(result?.timestamp).toBe(ts.toISOString());
  });
});
