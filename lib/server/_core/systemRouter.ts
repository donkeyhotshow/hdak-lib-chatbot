import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getAllResources } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /**
   * Deep health check — verifies that the server can reach the database.
   * Returns `{ ok: true, dbReachable: true }` when the DB responds, or
   * `{ ok: false, dbReachable: false, error: string }` on failure.
   * Used by Docker health-check scripts and monitoring dashboards.
   */
  healthCheck: publicProcedure.query(async () => {
    try {
      await getAllResources();
      return { ok: true, dbReachable: true } as const;
    } catch (err) {
      return {
        ok: false,
        dbReachable: false,
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
