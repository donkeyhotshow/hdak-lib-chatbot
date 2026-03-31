import { NextRequest, NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { stripHtml } from '@/lib/sanitize';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';

// M30: shared CORS helper — single source of truth for both GET and POST
// H22: fixed — must check BOTH hosts are local, not just origin
function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || process.env.NODE_ENV !== 'production') return false;
  try {
    const originHost = new URL(origin).hostname;
    const reqHost = new URL(request.url).hostname;
    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    // Allow only if both origin and request are on the same host, or both are local
    const isLocal = localHosts.includes(originHost) && localHosts.includes(reqHost);
    return originHost !== reqHost && !isLocal;
  } catch {
    return true;
  }
}

const PAGE_SIZE = 15;
const MAX_TITLE_LENGTH = 200;

export async function GET(request: NextRequest) {
  // Rate limiting
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }

  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонений запит' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10) || PAGE_SIZE), 50);

    const list = await db.select()
      .from(conversations)
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
  // Rate limiting
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }

  try {
    if (isForbiddenOrigin(request)) {
      return NextResponse.json({ error: 'Заборонений запит' }, { status: 403 });
    }

    let body: { title?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 });
    }

    // Validate and sanitize title
    let title = 'Новий діалог';
    if (typeof body.title === 'string' && body.title.trim()) {
      title = stripHtml(body.title.trim()).substring(0, MAX_TITLE_LENGTH);
      if (!title) title = 'Новий діалог';
    }

    const [newConv] = await db.insert(conversations).values({ title }).returning();
    return NextResponse.json(newConv);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка створення розмови' }, { status: 500 });
  }
}
