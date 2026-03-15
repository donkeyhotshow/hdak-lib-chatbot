import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/lib/server/routers";

export const trpc = createTRPCReact<AppRouter>();
