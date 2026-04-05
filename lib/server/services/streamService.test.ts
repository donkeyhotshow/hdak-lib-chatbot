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
    const abort = vi.fn();

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: () => {
          // Intentionally left hanging to trigger timeout.
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({ error: "Stream timeout" });
    expect(abort).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("clears stream timeout when client disconnects", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    const abort = vi.fn();

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: () => {
          res.emit("close");
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs + 100);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("sends 413 and aborts when stream bytes exceed the limit (headers not sent)", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    const abort = vi.fn();
    const maxBytes = SECURITY_CONFIG.responseLimits.maxResponseLength * 2;
    const bigChunk = Buffer.alloc(maxBytes + 1);

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: r => {
          r.write(bigChunk);
        },
      },
      res
    );

    expect(abort).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Stream too large" });
    vi.useRealTimers();
  });

  it("ends response when stream exceeds limit and headers already sent", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    res.headersSent = true;
    const abort = vi.fn();
    const maxBytes = SECURITY_CONFIG.responseLimits.maxResponseLength * 2;
    const bigChunk = Buffer.alloc(maxBytes + 1);

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: r => {
          r.write(bigChunk);
        },
      },
      res
    );

    expect(abort).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("ends response on timeout when headers are already sent", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    res.headersSent = true;
    const abort = vi.fn();

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: () => {
          // Hang to trigger timeout
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs);

    expect(abort).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clears timeout when finish event fires", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    const abort = vi.fn();

    streamToHttpResponse(
      {
        abort,
        pipeUIMessageStreamToResponse: () => {
          res.emit("finish");
        },
      },
      res
    );

    vi.advanceTimersByTime(SECURITY_CONFIG.chat.timeoutMs + 100);

    expect(res.status).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("ignores writes when response is already destroyed", () => {
    vi.useFakeTimers();
    const res = createMockResponse();
    res.destroyed = true;
    const originalWrite = res.write;

    streamToHttpResponse(
      {
        pipeUIMessageStreamToResponse: r => {
          const result = r.write("should be ignored");
          expect(result).toBe(false);
        },
      },
      res
    );

    expect(vi.mocked(originalWrite)).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
