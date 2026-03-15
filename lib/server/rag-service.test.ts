import { describe, it, expect } from "vitest";
import { chunkText, cosineSimilarity } from "./rag-service";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("hello world", 1000, 200);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("hello world");
  });

  it("returns correct chunks for text exactly equal to chunkSize", () => {
    const text = "a".repeat(1000);
    const chunks = chunkText(text, 1000, 200);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("does not infinite-loop when remaining text is shorter than overlap (1500-char text)", () => {
    // This triggers the previously-broken path:
    // text.length=1500, chunkSize=1000, overlap=200
    // Without the fix: start stays at 1300 forever → infinite loop.
    const text = "x".repeat(1500);
    const chunks = chunkText(text, 1000, 200);
    // Expect exactly 2 chunks: [0..1000] and [800..1500]
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(700);
  });

  it("does not infinite-loop for text length = chunkSize + 1", () => {
    const text = "a".repeat(1001);
    const chunks = chunkText(text, 1000, 200);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(1000);
    // Second chunk starts at 800 (1000 - 200 overlap) and ends at 1001: length = 201
    expect(chunks[1]).toHaveLength(201);
  });

  it("produces overlapping chunks for text longer than two chunks", () => {
    // 2500 chars → chunks at [0,1000], [800,1800], [1600,2500]
    const text = "b".repeat(2500);
    const chunks = chunkText(text, 1000, 200);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(1000);
    expect(chunks[2]).toHaveLength(900);
  });

  it("returns empty array for empty text", () => {
    expect(chunkText("", 1000, 200)).toHaveLength(0);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical non-zero vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for vectors of different lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 (not NaN) when the first vector is all zeros", () => {
    // Previously returned NaN → caused silent filtering failures
    const result = cosineSimilarity([0, 0, 0], [1, 2, 3]);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns 0 (not NaN) when the second vector is all zeros", () => {
    const result = cosineSimilarity([1, 2, 3], [0, 0, 0]);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns 0 (not NaN) when both vectors are all zeros", () => {
    const result = cosineSimilarity([0, 0], [0, 0]);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});
