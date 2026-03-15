import { logger } from "@/lib/server/_core/logger";
import { authenticateUserFromRequest } from "@/lib/server/_core/nextContext";
import { processDocument } from "@/lib/server/rag-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await authenticateUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      content,
      language = "uk",
      sourceType = "other",
      url,
      author,
    } = body as {
      title?: unknown;
      content?: unknown;
      language?: unknown;
      sourceType?: unknown;
      url?: unknown;
      author?: unknown;
    };

    if (typeof title !== "string" || !title.trim()) {
      return Response.json(
        { error: "title must be a non-empty string" },
        { status: 400 }
      );
    }
    if (title.length > 500) {
      return Response.json(
        { error: "title must be at most 500 characters" },
        { status: 400 }
      );
    }
    if (typeof content !== "string" || !content.trim()) {
      return Response.json(
        { error: "content must be a non-empty string" },
        { status: 400 }
      );
    }
    if (typeof url === "string" && url.length > 2048) {
      return Response.json(
        { error: "url must be at most 2048 characters" },
        { status: 400 }
      );
    }
    if (typeof author === "string" && author.length > 500) {
      return Response.json(
        { error: "author must be at most 500 characters" },
        { status: 400 }
      );
    }

    const validLangs = ["en", "uk", "ru"] as const;
    const validSources = ["catalog", "repository", "database", "other"] as const;
    const lang = validLangs.includes(language as (typeof validLangs)[number])
      ? (language as (typeof validLangs)[number])
      : "uk";
    const src = validSources.includes(sourceType as (typeof validSources)[number])
      ? (sourceType as (typeof validSources)[number])
      : "other";

    const documentId = `manual_${Date.now()}_${title.slice(0, 40).replace(/\s+/g, "_")}`;

    const result = await processDocument(
      documentId,
      title,
      content,
      src,
      lang,
      typeof url === "string" ? url : undefined,
      typeof author === "string" ? author : undefined
    );

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error ?? "Processing failed" },
        { status: 422 }
      );
    }

    return Response.json({
      success: true,
      chunksCreated: result.chunksCreated,
      documentId,
    });
  } catch (error) {
    logger.error("[/api/admin/process-pdf] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
