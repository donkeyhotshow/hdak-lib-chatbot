import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../../drizzle/schema";
import { sdk } from "./sdk";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(req);
  } catch (error) {
    logger.debug?.("[tRPC] Unauthenticated request", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    req,
    res,
    user,
  };
}
