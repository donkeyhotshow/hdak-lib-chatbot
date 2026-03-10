import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import * as db from "./db";
import { logger } from "./_core/logger";
import { DocumentChunk, InsertDocumentChunk, InsertDocumentMetadata } from "../drizzle/schema";

/**
 * RAG Service - Handles PDF processing, chunking, and embedding generation
 */

// Configuration
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

/**
 * Generate embedding for a text chunk using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[generateEmbedding] Failed to generate embedding", { error: msg });
    throw new Error(`Failed to generate embedding: ${msg}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Process a document atomically: all chunks must succeed or the entire
 * operation is rolled back (all created chunks are deleted) and the
 * document status is set to 'failed'.
 *
 * Status lifecycle: processing → completed | failed
 */
export async function processDocument(
  documentId: string,
  title: string,
  content: string,
  sourceType: "catalog" | "repository" | "database" | "other",
  language: "en" | "uk" | "ru" = "uk",
  url?: string,
  author?: string,
  publishedDate?: Date
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  const chunks = chunkText(content);

  // Store metadata with status='processing' before we begin
  const metadata: InsertDocumentMetadata = {
    documentId,
    title,
    sourceType,
    language,
    totalChunks: chunks.length,
    isProcessed: 0,
    status: "processing",
    ...(url ? { url } : {}),
    ...(author ? { author } : {}),
    ...(publishedDate ? { publishedDate } : {}),
  };

  try {
    await db.createDocumentMetadata(metadata);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("[RAG] Failed to create document metadata", { error: errorMsg, documentId });
    return { success: false, chunksCreated: 0, error: errorMsg };
  }

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // generateEmbedding throws on API error — caught below to trigger rollback
      const embedding = await generateEmbedding(chunk);

      await db.createDocumentChunk({
        documentId,
        documentTitle: title,
        documentUrl: url,
        chunkIndex: i,
        content: chunk,
        embedding,
        sourceType,
        language,
      });
    }

    // All chunks succeeded — mark as completed
    await db.updateDocumentMetadata(documentId, {
      isProcessed: 1,
      status: "completed",
      processingError: null,
    });

    logger.info(`[RAG] Document processed successfully`, {
      documentId,
      title,
      chunks: chunks.length,
    });

    return { success: true, chunksCreated: chunks.length };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    logger.warn("[RAG] Atomic rollback triggered — removing partial chunks", {
      documentId,
      error: errorMsg,
    });

    // Rollback: delete all chunks inserted before the failure (identified by documentId)
    await db.deleteDocumentChunks(documentId);

    // Mark metadata as failed
    await db.updateDocumentMetadata(documentId, {
      isProcessed: 0,
      status: "failed",
      processingError: errorMsg,
    });

    return { success: false, chunksCreated: 0, error: errorMsg };
  }
}

/**
 * Search for relevant document chunks using semantic similarity
 */
export async function semanticSearch(
  query: string,
  language: "en" | "uk" | "ru" = "uk",
  topK: number = 5,
  similarityThreshold: number = 0.5
): Promise<{ chunks: DocumentChunk[]; embeddingUnavailable?: boolean }> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Get all chunks from the database (capped at 100 by db layer)
    const allChunks = await db.getDocumentChunks(language);

    if (!allChunks || allChunks.length === 0) {
      return { chunks: [] };
    }

    // Calculate similarity scores
    const scoredChunks = allChunks
      .map((chunk: DocumentChunk) => {
        const embedding = chunk.embedding as number[] | null;
        if (!embedding || !Array.isArray(embedding)) {
          return { chunk, score: 0 };
        }
        const score = cosineSimilarity(queryEmbedding, embedding);
        return { chunk, score };
      })
      .filter((item: any) => item.score >= similarityThreshold)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);

    return { chunks: scoredChunks.map((item: any) => item.chunk) };
  } catch (error) {
    logger.error("[RAG] Semantic search failed — embedding API unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { chunks: [], embeddingUnavailable: true };
  }
}

/**
 * Get RAG context for AI responses.
 * Returns a localized fallback message when the embedding API is unavailable,
 * or an empty string when no relevant chunks are found.
 */
export async function getRagContext(
  query: string,
  language: "en" | "uk" | "ru" = "uk"
): Promise<string> {
  const result = await semanticSearch(query, language, 3);

  if (result.embeddingUnavailable) {
    const unavailableMsg: Record<string, string> = {
      uk: "\n\n> ⚠️ Пошук по документах тимчасово недоступний.",
      ru: "\n\n> ⚠️ Поиск по документам временно недоступен.",
      en: "\n\n> ⚠️ Document search is temporarily unavailable.",
    };
    return unavailableMsg[language] ?? unavailableMsg.uk;
  }

  const relevantChunks = result.chunks;

  if (relevantChunks.length === 0) {
    logger.info("[RAG] No relevant context found", { query: query.slice(0, 80) });
    return "";
  }

  logger.info(`[RAG] Context found (${relevantChunks.length} chunks)`, {
    query: query.slice(0, 80),
    sources: relevantChunks.map(c => c.documentTitle).filter(Boolean),
  });

  const context = relevantChunks
    .map((chunk) => {
      const source = chunk.documentTitle || "Unknown";
      const url = chunk.documentUrl ? ` (${chunk.documentUrl})` : "";
      return `**${source}${url}:**\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return `\n\n## Релевантна інформація з документів:\n\n${context}`;
}
