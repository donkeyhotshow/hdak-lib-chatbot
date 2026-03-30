import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 200;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Невірний ідентифікатор' }, { status: 400 });
    }

    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    
    if (!conversation) return NextResponse.json({ error: 'Розмову не знайдено' }, { status: 404 });

    // Load last 100 messages to prevent huge payloads
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))
      .limit(100);
    
    return NextResponse.json({ ...conversation, messages: msgs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isForbiddenOrigin(request)) {
      return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Невірний ідентифікатор' }, { status: 400 });
    }

    await db.delete(conversations).where(eq(conversations.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isForbiddenOrigin(request)) {
      return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Невірний ідентифікатор' }, { status: 400 });
    }

    let body: { title?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 });
    }

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Назва не може бути порожньою' }, { status: 400 });
    }

    const title = sanitizeHtml(body.title.trim(), { allowedTags: [], allowedAttributes: {} }).substring(0, MAX_TITLE_LENGTH);
    if (!title) {
      return NextResponse.json({ error: 'Назва не може бути порожньою' }, { status: 400 });
    }

    const [updated] = await db.update(conversations).set({ title }).where(eq(conversations.id, id)).returning();
    if (!updated) {
      return NextResponse.json({ error: 'Розмову не знайдено' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
