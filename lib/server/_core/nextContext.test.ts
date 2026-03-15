import { COOKIE_NAME } from "@shared/const";
import { describe, expect, it } from "vitest";
import {
  appendExpiredSessionCookie,
  createTrpcFetchContext,
} from "./nextContext";

describe("nextContext adapters", () => {
  it("appends an expired session cookie", () => {
    const req = new Request("http://localhost:3000/api/auth/logout", {
      headers: {
        cookie: `${COOKIE_NAME}=token`,
      },
    });
    const headers = new Headers();

    appendExpiredSessionCookie(req, headers);

    const setCookie = headers.get("set-cookie");
    expect(setCookie).toContain(`${COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("creates tRPC fetch context with anonymous user by default", async () => {
    const req = new Request("http://localhost:3000/api/trpc/system.getInfo");
    const resHeaders = new Headers();

    const ctx = await createTrpcFetchContext({ req, resHeaders });

    expect(ctx.user).toBeNull();
    expect(ctx.req).toBeTruthy();
    expect(ctx.res).toBeTruthy();
  });
});
