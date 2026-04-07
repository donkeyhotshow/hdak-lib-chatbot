import { NextRequest, NextResponse } from "next/server";
import { db, conversations } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { stripHtml } from "@/lib/sanitize";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { isForbiddenOrigin } from "@/lib/cors";
import { getSessionIdStrict } from "@/lib/validation";

const PAGE_SIZE = 15;
const MAX_TITLE_LENGTH = 200;

export async function GET(request: NextRequest) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонений запит" }, { status: 403 });
  }

  const sessionId = getSessionIdStrict(request);
  if (!sessionId) {
    // H5: return sessionRequired flag so client knows to retry after session init
    return NextResponse.json({
      items: [],
      hasMore: false,
      offset: 0,
      limit: PAGE_SIZE,
      sessionRequired: true,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );
    const limit = Math.min(
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10) ||
          PAGE_SIZE
      ),
      50
    );

    const list = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(desc(conversations.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = list.length > limit;
    const items = hasMore ? list.slice(0, limit) : list;

    return NextResponse.json({ items, hasMore, offset, limit });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Помилка завантаження розмов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонений запит" }, { status: 403 });
  }

  const sessionId = getSessionIdStrict(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Відсутній ідентифікатор сесії" },
      { status: 400 }
    );
  }

  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невірний формат запиту" },
      { status: 400 }
    );
  }

  let title = "Новий діалог";
  if (typeof body.title === "string" && body.title.trim()) {
    title = stripHtml(body.title.trim()).substring(0, MAX_TITLE_LENGTH);
    if (!title) title = "Новий діалог";
  }

  try {
    const [newConv] = await db
      .insert(conversations)
      .values({ title, sessionId })
      .returning();
    return NextResponse.json(newConv);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Помилка створення розмови" },
      { status: 500 }
    );
  }
}
