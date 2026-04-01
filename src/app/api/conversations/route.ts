import { NextRequest, NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import { stripHtml } from '@/lib/sanitize';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { SESSION_HEADER } from '@/lib/session';

function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || process.env.NODE_ENV !== 'production') return false;
  try {
    const originHost = new URL(origin).hostname;
    const reqHost = new URL(request.url).hostname;
    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    const isLocal = localHosts.includes(originHost) && localHosts.includes(reqHost);
    return originHost !== reqHost && !isLocal;
  } catch {
    return true;
  }
}

function getSessionId(request: NextRequest): string | null {
  const id = request.headers.get(SESSION_HEADER)?.trim();
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return id;
}

const PAGE_SIZE = 15;
const MAX_TITLE_LENGTH = 200;

export async function GET(request: NextRequest) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонений запит' }, { status: 403 });
  }

  const sessionId = getSessionId(request);
  if (!sessionId) {
    // No valid session — return empty list (client will init session and retry)
    return NextResponse.json({ items: [], hasMore: false, offset: 0, limit: PAGE_SIZE });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10) || PAGE_SIZE), 50);

    const list = await db.select()
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
    return NextResponse.json({ error: 'Помилка завантаження розмов' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонений запит' }, { status: 403 });
  }

  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Відсутній ідентифікатор сесії' }, { status: 400 });
  }

  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 });
  }

  let title = 'Новий діалог';
  if (typeof body.title === 'string' && body.title.trim()) {
    title = stripHtml(body.title.trim()).substring(0, MAX_TITLE_LENGTH);
    if (!title) title = 'Новий діалог';
  }

  try {
    const [newConv] = await db.insert(conversations).values({ title, sessionId }).returning();
    return NextResponse.json(newConv);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка створення розмови' }, { status: 500 });
  }
}
