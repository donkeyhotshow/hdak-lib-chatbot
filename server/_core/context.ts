import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: {
    id: number;
    openId: string;
    name: string | null;
    role: "user" | "admin";
    language: "en" | "uk" | "ru";
  };
};

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<TrpcContext> {
  return {
    req,
    res,
    user: {
      id: 1,
      openId: "public",
      name: "Guest",
      role: "user",
      language: "uk",
    },
  };
}
