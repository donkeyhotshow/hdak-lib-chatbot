import { createTrpcFetchContext } from "@/lib/server/_core/nextContext";
import { appRouter } from "@/lib/server/routers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const runtime = "nodejs";

const handler = async (req: Request) => {
  const resHeaders = new Headers();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTrpcFetchContext({ req, resHeaders }),
    responseMeta() {
      return { headers: resHeaders };
    },
  });
};

export { handler as GET, handler as POST };
