import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEV_GUEST_USER: User = {
  id: 1,
  openId: "guest",
  name: "Гість",
  email: null,
  loginMethod: null,
  role: "user",
  language: "uk",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  if (!user && process.env.NODE_ENV !== "production") {
    user = DEV_GUEST_USER;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
