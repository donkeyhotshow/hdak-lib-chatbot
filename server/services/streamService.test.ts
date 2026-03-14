import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { SECURITY_CONFIG } from "../config/security";
import { streamToHttpResponse } from "./streamService";

function createMockResponse() {
  const emitter = new EventEmitter();
  const res = emitter as unknown as Response &
    EventEmitter & {
      headersSent: boolean;
      writableEnded: boolean;
      destroyed: boolean;
    };
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.write = vi.fn(() => true) as unknown as Response["write"];
  res.status = vi.fn(() => res) as unknown as Response["status"];
  res.json = vi.fn(() => res) as unknown as Response["json"];
  res.end = vi.fn(() => {
    res.writableEnded = true;
    return res;
  }) as unknown as Response["end"];
  return res;
}

describe("streamService", () => {
  it("returns timeout response when stream does not finish in time", () => {
    vi.useFakeTimers();
    const res = createMockResponse();

    streamToHttpResponse(
      {
        pipeUIMessageStreamToResponse: () => {
          // Intentionally left hanging to trigger timeout.
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({ error: "Stream timeout" });
    vi.useRealTimers();
  });

  it("clears stream timeout when client disconnects", () => {
    vi.useFakeTimers();
    const res = createMockResponse();

    streamToHttpResponse(
      {
        pipeUIMessageStreamToResponse: () => {
          res.emit("close");
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs + 100);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
