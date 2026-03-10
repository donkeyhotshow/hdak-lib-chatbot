/**
 * RAG Service tests
 *
 * Validates fault-tolerance (no crash on API failures) and atomic
 * rollback behaviour of processDocument.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chunkText, cosineSimilarity, getRagContext, processDocument, semanticSearch } from "../rag-service";
import * as db from "../db";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("ai", () => ({
  embed: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn(() => "mock-embedding-model") },
}));

vi.mock("../db", () => ({
  getDocumentChunks: vi.fn(),
  createDocumentChunk: vi.fn(),
  createDocumentMetadata: vi.fn(),
  updateDocumentMetadata: vi.fn(),
  deleteDocumentChunks: vi.fn(),
}));

import { embed } from "ai";
const mockedEmbed = embed as unknown as ReturnType<typeof vi.fn>;
const mockedGetDocumentChunks = db.getDocumentChunks as unknown as ReturnType<typeof vi.fn>;
const mockedCreateDocumentChunk = db.createDocumentChunk as unknown as ReturnType<typeof vi.fn>;
const mockedCreateDocumentMetadata = db.createDocumentMetadata as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateDocumentMetadata = db.updateDocumentMetadata as unknown as ReturnType<typeof vi.fn>;
const mockedDeleteDocumentChunks = db.deleteDocumentChunks as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── chunkText ─────────────────────────────────────────────────────────────────

describe("chunkText", () => {
  it("returns a single chunk when text is shorter than chunk size", () => {
    const chunks = chunkText("short text", 1000, 200);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("short text");
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(2000);
    const chunks = chunkText(text, 1000, 200);
    // Each chunk is 1000 chars; second starts at 800 (1000 - 200 overlap)
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBe(1000);
  });
});

// ── cosineSimilarity ──────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for vectors of different lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

// ── getRagContext: fault tolerance ────────────────────────────────────────────

describe("getRagContext — fault tolerance", () => {
  it("does not throw when the embedding API is unavailable; returns fallback message", async () => {
    // Simulate OpenAI quota/timeout error
    mockedEmbed.mockRejectedValueOnce(new Error("OpenAI API quota exceeded"));

    let result: string | undefined;
    // The call must NOT throw — the whole chat pipeline depends on this
    await expect(
      (async () => { result = await getRagContext("library catalog", "uk"); })()
    ).resolves.not.toThrow();

    // Returns the Ukrainian unavailability notice
    expect(result).toContain("⚠️");
    expect(result).toContain("тимчасово недоступний");
  });

  it("returns empty string when no relevant chunks are found", async () => {
    mockedEmbed.mockResolvedValueOnce({ embedding: [1, 0] });
    mockedGetDocumentChunks.mockResolvedValueOnce([]);

    const result = await getRagContext("query", "en");
    expect(result).toBe("");
  });

  it("returns formatted RAG context with chunk sources when relevant chunks exist", async () => {
    const queryEmbedding = [1, 0];
    const chunkEmbedding = [0.9, 0.1]; // high cosine similarity

    mockedEmbed.mockResolvedValueOnce({ embedding: queryEmbedding });
    mockedGetDocumentChunks.mockResolvedValueOnce([
      {
        id: 1,
        documentId: "doc1",
        documentTitle: "Каталог ХДАК",
        documentUrl: "https://lib-hdak.in.ua/e-catalog.html",
        chunkIndex: 0,
        content: "Бібліотека ХДАК містить понад 500 000 документів.",
        embedding: chunkEmbedding,
        sourceType: "catalog",
        language: "uk",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await getRagContext("каталог", "uk");
    expect(result).toContain("Релевантна інформація");
    expect(result).toContain("Каталог ХДАК");
  });
});

// ── semanticSearch: embedding unavailable ────────────────────────────────────

describe("semanticSearch", () => {
  it("returns embeddingUnavailable=true when embedding API throws", async () => {
    mockedEmbed.mockRejectedValueOnce(new Error("timeout"));

    const result = await semanticSearch("test", "en");
    expect(result.embeddingUnavailable).toBe(true);
    expect(result.chunks).toHaveLength(0);
  });

  it("returns empty chunks when DB has no chunks", async () => {
    mockedEmbed.mockResolvedValueOnce({ embedding: [1, 0] });
    mockedGetDocumentChunks.mockResolvedValueOnce([]);

    const result = await semanticSearch("query", "uk");
    expect(result.chunks).toHaveLength(0);
    expect(result.embeddingUnavailable).toBeUndefined();
  });
});

// ── processDocument: atomic rollback ─────────────────────────────────────────

describe("processDocument — atomic rollback", () => {
  const BASE_ARGS = [
    "doc-1",
    "Test Document",
    "Content that is long enough to generate multiple chunks when we repeat it a few times.",
    "catalog",
    "uk",
  ] as const;

  it("rolls back partial chunks and sets status=failed when embedding API fails mid-document", async () => {
    mockedCreateDocumentMetadata.mockResolvedValue({ id: 1 });
    // First chunk succeeds
    mockedEmbed.mockResolvedValueOnce({ embedding: [1, 0] });
    mockedCreateDocumentChunk.mockResolvedValueOnce({ id: 10 });
    // Second chunk fails
    mockedEmbed.mockRejectedValueOnce(new Error("quota exceeded"));
    mockedDeleteDocumentChunks.mockResolvedValue(true);
    mockedUpdateDocumentMetadata.mockResolvedValue(null);

    const result = await processDocument(...BASE_ARGS);

    expect(result.success).toBe(false);
    expect(result.chunksCreated).toBe(0);
    expect(result.error).toContain("quota exceeded");

    // Rollback must delete all partial chunks
    expect(mockedDeleteDocumentChunks).toHaveBeenCalledWith("doc-1");

    // Status must be set to 'failed'
    expect(mockedUpdateDocumentMetadata).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ status: "failed", isProcessed: 0 })
    );
  });

  it("sets status=completed and isProcessed=1 on full success", async () => {
    mockedCreateDocumentMetadata.mockResolvedValue({ id: 2 });
    // All embed calls succeed
    mockedEmbed.mockResolvedValue({ embedding: [1, 0] });
    mockedCreateDocumentChunk.mockResolvedValue({ id: 20 });
    mockedUpdateDocumentMetadata.mockResolvedValue(null);

    const shortContent = "Short content."; // single chunk
    const result = await processDocument(
      "doc-2", "Short Doc", shortContent, "catalog", "uk"
    );

    expect(result.success).toBe(true);
    expect(result.chunksCreated).toBe(1);

    // Metadata must be finalised as completed
    expect(mockedUpdateDocumentMetadata).toHaveBeenCalledWith(
      "doc-2",
      expect.objectContaining({ status: "completed", isProcessed: 1 })
    );

    // No rollback should have occurred
    expect(mockedDeleteDocumentChunks).not.toHaveBeenCalled();
  });
});
