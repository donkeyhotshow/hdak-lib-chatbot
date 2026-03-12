/**
 * Extended tests for server/rag-service.ts
 *
 * Covers:
 * - getRagContext: empty chunks, chunk formatting, embeddingUnavailable fallback
 * - semanticSearch: threshold filtering, topK limiting, missing embedding handling
 * - generateEmbedding: success and error paths
 * - processDocument: success path, empty content, truncation, embedding failure (rollback)
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRagContext,
  semanticSearch,
  generateEmbedding,
  processDocument,
} from "./rag-service";
import * as db from "./db";
import { embed } from "ai";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

vi.mock("ai", () => ({
  embed: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: vi.fn(() => "mock-embedding-model"),
  },
}));

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makeChunk(
  id: number,
  content: string,
  embedding: number[] | null = null
) {
  return {
    id,
    documentId: `doc-${id}`,
    documentTitle: `Doc ${id}`,
    documentUrl: `https://example.com/doc-${id}`,
    content,
    embedding,
    language: "uk" as const,
    chunkIndex: 0,
    sourceType: "other" as const,
    createdAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// getRagContext
// ---------------------------------------------------------------------------

describe("getRagContext — no chunks", () => {
  it("returns empty string when there are no document chunks", async () => {
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([]);

    const result = await getRagContext("test query", "uk");
    expect(result).toBe("");
  });
});

describe("getRagContext — embeddingUnavailable fallback", () => {
  it("returns Ukrainian fallback notice when embedding API fails", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("API down"));
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([]);

    const result = await getRagContext("test query", "uk");
    expect(result).toContain("⚠️");
    expect(result).toContain("тимчасово недоступний");
  });

  it("returns English fallback notice for 'en' when embedding API fails", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("API down"));
    const result = await getRagContext("test query", "en");
    expect(result).toContain("temporarily unavailable");
  });

  it("returns Russian fallback notice for 'ru' when embedding API fails", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("API down"));
    const result = await getRagContext("test query", "ru");
    expect(result).toContain("временно недоступен");
  });
});

describe("getRagContext — with matching chunks", () => {
  it("returns formatted Markdown context with chunk content", async () => {
    // A chunk with a unit vector so cosineSimilarity = 1
    const chunk = makeChunk(1, "Library opens at 9am", [1, 0, 0]);
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([chunk]);

    const result = await getRagContext("library hours", "uk");
    expect(result).toContain("Library opens at 9am");
    expect(result).toContain("Doc 1");
  });

  it("includes document URL in the context block", async () => {
    const chunk = makeChunk(2, "Catalog search help", [1, 0, 0]);
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([chunk]);

    const result = await getRagContext("catalog", "uk");
    expect(result).toContain("https://example.com/doc-2");
  });
});

// ---------------------------------------------------------------------------
// semanticSearch
// ---------------------------------------------------------------------------

describe("semanticSearch — threshold filtering", () => {
  it("excludes chunks whose similarity is below the threshold", async () => {
    // query embedding: [1, 0, 0]; chunk embedding: [0, 1, 0] → cosine = 0
    const chunk = makeChunk(1, "Irrelevant content", [0, 1, 0]);
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([chunk]);

    const result = await semanticSearch("test", "uk", 5, 0.5);
    expect(result.chunks).toHaveLength(0);
  });

  it("includes chunks whose similarity meets or exceeds the threshold", async () => {
    const chunk = makeChunk(1, "Highly relevant", [1, 0, 0]);
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([chunk]);

    const result = await semanticSearch("test", "uk", 5, 0.5);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toBe("Highly relevant");
  });
});

describe("semanticSearch — topK limiting", () => {
  it("limits results to topK chunks", async () => {
    const chunks = [
      makeChunk(1, "Content A", [1, 0, 0]),
      makeChunk(2, "Content B", [1, 0, 0]),
      makeChunk(3, "Content C", [1, 0, 0]),
    ];
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce(chunks);

    const result = await semanticSearch("test", "uk", 2, 0.5);
    expect(result.chunks).toHaveLength(2);
  });
});

describe("semanticSearch — missing embedding on chunk", () => {
  it("assigns score 0 for chunks with null embedding (filtered out)", async () => {
    const chunkNullEmbed = makeChunk(1, "No embed", null);
    const chunkValid = makeChunk(2, "Valid embed", [1, 0, 0]);
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0, 0],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([
      chunkNullEmbed,
      chunkValid,
    ]);

    const result = await semanticSearch("test", "uk", 5, 0.5);
    // null-embed chunk gets score 0 → filtered below threshold 0.5
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toBe("Valid embed");
  });
});

describe("semanticSearch — returns embeddingUnavailable on API error", () => {
  it("sets embeddingUnavailable=true when embedding call fails", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("rate limit"));
    const result = await semanticSearch("test", "uk");
    expect(result.embeddingUnavailable).toBe(true);
    expect(result.chunks).toHaveLength(0);
  });
});

describe("semanticSearch — empty DB", () => {
  it("returns empty chunks when there are no document chunks in DB", async () => {
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [1, 0],
      usage: { tokens: 2 },
    } as any);
    vi.spyOn(db, "getDocumentChunks").mockResolvedValueOnce([]);
    const result = await semanticSearch("test", "uk");
    expect(result.chunks).toHaveLength(0);
    expect(result.embeddingUnavailable).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateEmbedding
// ---------------------------------------------------------------------------

describe("generateEmbedding", () => {
  it("returns the embedding vector on success", async () => {
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [0.1, 0.2, 0.3],
      usage: { tokens: 3 },
    } as any);
    const result = await generateEmbedding("some text");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws a descriptive error when the embedding API fails", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("API error 500"));
    await expect(generateEmbedding("fail")).rejects.toThrow(
      "Failed to generate embedding"
    );
  });

  it("includes the original error message in the thrown error", async () => {
    vi.mocked(embed).mockRejectedValueOnce(new Error("timeout 30s"));
    await expect(generateEmbedding("fail")).rejects.toThrow("timeout 30s");
  });
});

// ---------------------------------------------------------------------------
// processDocument
// ---------------------------------------------------------------------------

describe("processDocument — empty and whitespace content", () => {
  it("returns success=false and an error message for empty content", async () => {
    const result = await processDocument("doc-1", "Title", "", "other", "uk");
    expect(result.success).toBe(false);
    expect(result.chunksCreated).toBe(0);
    expect(result.error).toBeDefined();
  });

  it("returns success=false for whitespace-only content", async () => {
    const result = await processDocument(
      "doc-2",
      "Title",
      "   \n   ",
      "other",
      "uk"
    );
    expect(result.success).toBe(false);
    expect(result.chunksCreated).toBe(0);
  });
});

describe("processDocument — createDocumentMetadata failure", () => {
  it("returns success=false when createDocumentMetadata throws", async () => {
    vi.spyOn(db, "createDocumentMetadata").mockRejectedValueOnce(
      new Error("DB connection lost")
    );
    const result = await processDocument(
      "doc-3",
      "Title",
      "Some content here.",
      "other",
      "uk"
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("DB connection lost");
  });
});

describe("processDocument — embedding failure triggers rollback", () => {
  it("rolls back and returns success=false when embedding API fails", async () => {
    vi.spyOn(db, "createDocumentMetadata").mockResolvedValueOnce(null);
    vi.mocked(embed).mockRejectedValueOnce(new Error("embedding API down"));
    vi.spyOn(db, "deleteDocumentChunks").mockResolvedValueOnce(true);
    vi.spyOn(db, "updateDocumentMetadata").mockResolvedValueOnce(null);

    const result = await processDocument(
      "doc-4",
      "Title",
      "Enough content to produce at least one chunk.",
      "other",
      "uk"
    );

    expect(result.success).toBe(false);
    expect(result.chunksCreated).toBe(0);
    expect(result.error).toContain("embedding API down");
    expect(db.deleteDocumentChunks).toHaveBeenCalledWith("doc-4");
    expect(db.updateDocumentMetadata).toHaveBeenCalledWith(
      "doc-4",
      expect.objectContaining({ status: "failed" })
    );
  });
});

describe("processDocument — success path", () => {
  it("returns success=true and the number of chunks created", async () => {
    vi.spyOn(db, "createDocumentMetadata").mockResolvedValueOnce(null);
    // Succeed for every embedding call
    vi.mocked(embed).mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { tokens: 3 },
    } as any);
    vi.spyOn(db, "createDocumentChunk").mockResolvedValue(null);
    vi.spyOn(db, "updateDocumentMetadata").mockResolvedValue(null);

    const content = "Word ".repeat(100); // ~500 chars — fits in one chunk
    const result = await processDocument(
      "doc-5",
      "My Document",
      content,
      "catalog",
      "en"
    );

    expect(result.success).toBe(true);
    expect(result.chunksCreated).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it("truncates content that exceeds MAX_DOCUMENT_SIZE", async () => {
    vi.spyOn(db, "createDocumentMetadata").mockResolvedValueOnce(null);
    vi.mocked(embed).mockResolvedValue({
      embedding: [0.1],
      usage: { tokens: 1 },
    } as any);
    vi.spyOn(db, "createDocumentChunk").mockResolvedValue(null);
    vi.spyOn(db, "updateDocumentMetadata").mockResolvedValue(null);

    // 600 000 chars > MAX_DOCUMENT_SIZE (500 000)
    const hugeContent = "A".repeat(600_000);
    const result = await processDocument(
      "doc-6",
      "Big Doc",
      hugeContent,
      "other",
      "uk"
    );

    // Should still succeed (truncated to max size)
    expect(result.success).toBe(true);
    expect(result.chunksCreated).toBeGreaterThan(0);
  });

  it("stores optional url, author, and publishedDate", async () => {
    vi.spyOn(db, "createDocumentMetadata").mockResolvedValueOnce(null);
    vi.mocked(embed).mockResolvedValue({
      embedding: [0.5],
      usage: { tokens: 1 },
    } as any);
    vi.spyOn(db, "createDocumentChunk").mockResolvedValue(null);
    vi.spyOn(db, "updateDocumentMetadata").mockResolvedValue(null);

    const result = await processDocument(
      "doc-7",
      "Paper Title",
      "Abstract content for the paper.",
      "repository",
      "en",
      "https://example.com/paper",
      "Jane Doe",
      new Date("2025-01-01")
    );

    expect(result.success).toBe(true);
    expect(db.createDocumentMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/paper",
        author: "Jane Doe",
      })
    );
  });
});
