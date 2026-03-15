/**
 * Tests for server/_core/trpc.ts and server/_core/systemRouter.ts
 *
 * Covers:
 * - publicProcedure: accessible without auth
 * - protectedProcedure: throws UNAUTHORIZED when user is null
 * - adminProcedure: throws FORBIDDEN for regular users; works for admins
 * - system.health: basic liveness check
 * - system.healthCheck: DB-reachable and DB-unreachable paths
 * - system.notifyOwner: admin-only access guard
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "./context";
import * as db from "../db";
import * as notification from "./notification";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual };
});

vi.mock("./notification", () => ({
  notifyOwner: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(role: "user" | "admin" = "user"): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    language: "uk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// publicProcedure — auth.me
// ---------------------------------------------------------------------------

describe("publicProcedure — accessible without authentication", () => {
  it("auth.me returns null when unauthenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns the user when authenticated", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: user.id, email: user.email });
  });
});

// ---------------------------------------------------------------------------
// protectedProcedure — requires authenticated user
// ---------------------------------------------------------------------------

describe("protectedProcedure — requires authentication", () => {
  it("conversations.list throws UNAUTHORIZED when user is unauthenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.conversations.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("conversations.list works for authenticated users", async () => {
    vi.spyOn(db, "getConversations").mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.conversations.list();
    expect(result).toEqual([]);
  });

  it("conversations.create works for authenticated users", async () => {
    vi.spyOn(db, "createConversation").mockResolvedValue({
      id: 1,
      userId: 1,
      title: "Test",
      language: "uk",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.conversations.create({
      title: "Test",
      language: "uk",
    });
    expect(result.id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// adminProcedure — FORBIDDEN for regular users, allowed for admins
// ---------------------------------------------------------------------------

describe("adminProcedure — access control", () => {
  it("resources.create throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(
      caller.resources.create({
        nameEn: "Test",
        nameUk: "Тест",
        nameRu: "Тест",
        type: "other",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("contacts.create throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(
      caller.contacts.create({ type: "email", value: "x@y.com" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("libraryInfo.getAll throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(caller.libraryInfo.getAll()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("analytics.getQueryStats throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(caller.analytics.getQueryStats()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("sync.runNow throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(caller.sync.runNow()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("adminProcedure throws FORBIDDEN when user is not authenticated at all", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.sync.runNow()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ---------------------------------------------------------------------------
// system.health — liveness endpoint
// ---------------------------------------------------------------------------

describe("system.health", () => {
  it("returns { ok: true } for any valid timestamp", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toEqual({ ok: true });
  });

  it("accepts timestamp=0", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.system.health({ timestamp: 0 });
    expect(result).toEqual({ ok: true });
  });

  it("rejects negative timestamps", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.system.health({ timestamp: -1 })).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// system.healthCheck — DB connectivity probe
// ---------------------------------------------------------------------------

describe("system.healthCheck", () => {
  it("returns { ok: true, dbReachable: true } when getAllResources resolves", async () => {
    vi.spyOn(db, "getAllResources").mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.system.healthCheck();
    expect(result).toEqual({ ok: true, dbReachable: true });
  });

  it("returns { ok: false, dbReachable: false, error: string } when getAllResources throws", async () => {
    vi.spyOn(db, "getAllResources").mockRejectedValueOnce(
      new Error("DB unreachable")
    );
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.system.healthCheck();
    expect(result.ok).toBe(false);
    expect(result.dbReachable).toBe(false);
    expect(result.error).toContain("DB unreachable");
  });

  it("includes error string for non-Error rejections", async () => {
    vi.spyOn(db, "getAllResources").mockRejectedValueOnce("raw string error");
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.system.healthCheck();
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// system.notifyOwner — admin-only mutation
// ---------------------------------------------------------------------------

describe("system.notifyOwner", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(
      caller.system.notifyOwner({
        title: "Hi",
        content: "Body",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("calls notifyOwner and returns success for admin users", async () => {
    vi.mocked(notification.notifyOwner).mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(makeCtx(makeUser("admin")));
    const result = await caller.system.notifyOwner({
      title: "Alert",
      content: "Something happened",
    });
    expect(result.success).toBe(true);
    expect(notification.notifyOwner).toHaveBeenCalledWith({
      title: "Alert",
      content: "Something happened",
    });
  });

  it("returns success=false when notification delivery fails", async () => {
    vi.mocked(notification.notifyOwner).mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx(makeUser("admin")));
    const result = await caller.system.notifyOwner({
      title: "Fail",
      content: "Body",
    });
    expect(result.success).toBe(false);
  });

  it("validates that title is at least 1 character", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("admin")));
    await expect(
      caller.system.notifyOwner({ title: "", content: "Body" })
    ).rejects.toBeDefined();
  });

  it("validates that content is at least 1 character", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("admin")));
    await expect(
      caller.system.notifyOwner({ title: "Title", content: "" })
    ).rejects.toBeDefined();
  });
});
