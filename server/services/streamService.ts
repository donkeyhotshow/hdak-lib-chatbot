import type { Response } from "express";
import { SECURITY_CONFIG } from "../config/security";

type StreamResult = {
  pipeUIMessageStreamToResponse: (res: Response) => void;
};
type ResponseWriteParams = Parameters<Response["write"]>;

export function streamToHttpResponse(
  result: StreamResult,
  res: Response
): void {
  const maxBytes = SECURITY_CONFIG.responseLimits.maxResponseLength * 2;
  const timeoutMs = SECURITY_CONFIG.chat.timeoutMs;

  let streamBytes = 0;
  const originalWrite = res.write.bind(res);
  res.write = ((...writeArgs: ResponseWriteParams) => {
    const [chunk, ...args] = writeArgs;
    const size = Buffer.isBuffer(chunk)
      ? chunk.length
      : Buffer.byteLength(String(chunk));
    streamBytes += size;
    if (streamBytes > maxBytes) {
      if (!res.headersSent) {
        res.status(413).json({ error: "Stream too large" });
      } else if (!res.writableEnded) {
        res.end();
      }
      return false;
    }
    return originalWrite(chunk, ...args);
  }) as typeof res.write;

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: "Stream timeout" });
      return;
    }
    if (!res.writableEnded) {
      res.end();
    }
  }, timeoutMs);

  res.on("finish", () => clearTimeout(timeout));
  result.pipeUIMessageStreamToResponse(res);
}
