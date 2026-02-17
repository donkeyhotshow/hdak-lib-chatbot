import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import * as db from "./db";
import { DocumentChunk, DocumentMetadata, InsertDocumentChunk, InsertDocumentMetadata } from "../drizzle/schema";

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
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
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
 * Process a document and store chunks with embeddings
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
  try {
    // Create document metadata
    const chunks = chunkText(content);

    // Store metadata
    const metadata: any = {
      documentId,
      title,
      sourceType,
      language,
      totalChunks: chunks.length,
      isProcessed: 0,
    };

    if (url) metadata.url = url;
    if (author) metadata.author = author;
    if (publishedDate) metadata.publishedDate = publishedDate;

    await db.createDocumentMetadata(metadata);

    // Process each chunk
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);

        await db.createDocumentChunk({
          documentId,
          documentTitle: title,
          documentUrl: url,
          chunkIndex: i,
          content: chunk,
          embedding: embedding,
          sourceType,
          language,
        });

        successCount++;
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
      }
    }

    // Update metadata with processing status
    await db.updateDocumentMetadata(documentId, {
      isProcessed: successCount === chunks.length ? 1 : 0,
      processingError: successCount < chunks.length ? "Partial processing completed" : null,
    });

    return {
      success: successCount === chunks.length,
      chunksCreated: successCount,
    };
  } catch (error) {
    console.error("Error processing document:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Update metadata with error
    await db.updateDocumentMetadata(documentId, {
      isProcessed: 0,
      processingError: errorMsg,
    });

    return {
      success: false,
      chunksCreated: 0,
      error: errorMsg,
    };
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
): Promise<DocumentChunk[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Get all chunks from the database
    const allChunks = await db.getDocumentChunks(language);

    if (!allChunks || allChunks.length === 0) {
      return [];
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

    return scoredChunks.map((item: any) => item.chunk);
  } catch (error) {
    console.error("Error in semantic search:", error);
    return [];
  }
}

/**
 * Get RAG context for AI responses
 */
export async function getRagContext(
  query: string,
  language: "en" | "uk" | "ru" = "uk"
): Promise<string> {
  const relevantChunks = await semanticSearch(query, language, 3);

  if (relevantChunks.length === 0) {
    return "";
  }

  const context = relevantChunks
    .map((chunk) => {
      const source = chunk.documentTitle || "Unknown";
      return `**${source}:**\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return `\n\n## Релевантна інформація з документів:\n\n${context}`;
}
