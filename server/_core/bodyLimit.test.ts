/**
 * Tests for request body size limits.
 *
 * The global body-parser is configured with a 1 MB limit to protect public
 * endpoints against abuse.  The /api/admin/process-pdf route overrides this
 * with a 50 MB per-route limit to allow large PDF text payloads.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import * as http from "node:http";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();

  // ── Mirrors server/_core/index.ts middleware order ────────────────────────

  // Admin PDF route registered FIRST with its own 50 MB body parser.
  // Once the handler sends a response, the global 1 MB parser below is never
  // reached for this path.
  app.post(
    "/api/admin/process-pdf",
    express.json({ limit: "50mb" }),
    (_req, res) => {
      res.json({ ok: true });
    }
  );

  // Global 1 MB limit — applies to all other routes
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Simulated public endpoint — uses the global limit
  app.post("/api/chat", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

let server: http.Server;
let baseUrl: string;

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = http.createServer(buildApp());
      server.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    })
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    })
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("1 MB global body limit — /api/chat", () => {
  it("accepts a request body well under 1 MB", async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects a request body over 1 MB with 413", async () => {
    // Build a JSON payload that exceeds 1 MB (1,048,576 bytes)
    const largeString = "x".repeat(1_100_000);
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: largeString }),
    });
    expect(res.status).toBe(413);
  });
});

describe("50 MB per-route limit — /api/admin/process-pdf", () => {
  it("accepts a 2 MB body that would be rejected by the global limit", async () => {
    const largeContent = "x".repeat(2_000_000);
    const res = await fetch(`${baseUrl}/api/admin/process-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", content: largeContent }),
    });
    // The per-route middleware allows it through; route handler responds 200
    expect(res.status).toBe(200);
  });
});
