import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages as messagesTable } from "@/lib/db";
import { stripHtml } from "@/lib/sanitize";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { isForbiddenOrigin } from "@/lib/cors";
import { getSessionIdFromRequest } from "@/lib/validation";

const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 10_000;

// Saves a FAQ Q&A pair directly to DB without calling LLM
export async function POST(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  let body: { question?: unknown; answer?: unknown };
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 100_000) {
      return NextResponse.json(
        { error: "Занадто великий запит" },
        { status: 413 }
      );
    }
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невірний формат запиту" },
      { status: 400 }
    );
  }

  // BUG FIX: faq-save strips HTML from answer — this corrupts markdown (removes *bold*, links, etc.)
  // Use a lighter sanitizer that only removes dangerous tags, not all markup
  const question =
    typeof body.question === "string"
      ? stripHtml(body.question.trim()).substring(0, MAX_QUESTION_LENGTH)
      : "";
  const answer =
    typeof body.answer === "string"
      ? body.answer
          .trim()
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
          .replace(/<object[\s\S]*?<\/object>/gi, "")
          .replace(/<embed[^>]*>/gi, "")
          .replace(/<img[^>]*>/gi, "")
          .replace(/<svg[\s\S]*?<\/svg>/gi, "")
          // Strip form tags (not content — removes the tag only)
          .replace(/<\/?form[^>]*>/gi, "")
          // Strip all event handlers — quoted AND unquoted values
          .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
          .replace(/\bjavascript\s*:/gi, "")
          .replace(/\bvbscript\s*:/gi, "")
          // Only strip actual data-URIs (data:type/subtype,...) — not plain Ukrainian "дані: ..."
          .replace(/\bdata\s*:[a-z][^,\s]{0,50},/gi, "")
          .substring(0, MAX_ANSWER_LENGTH)
      : "";

  if (!question || !answer) {
    return NextResponse.json(
      { error: "Запитання та відповідь обов'язкові" },
      { status: 400 }
    );
  }

  try {
    const sessionId = getSessionIdFromRequest(request);

    // neon-http driver does not support transactions — use sequential inserts
    const [conv] = await db
      .insert(conversations)
      .values({
        title: question.substring(0, 50),
        sessionId,
      })
      .returning();

    await db.insert(messagesTable).values([
      { conversationId: conv.id, role: "USER", content: question },
      { conversationId: conv.id, role: "ASSISTANT", content: answer },
    ]);

    return NextResponse.json({ conversationId: conv.id });
  } catch (error) {
    console.error("faq-save DB error:", error);
    return NextResponse.json({ error: "Помилка збереження" }, { status: 500 });
  }
}
