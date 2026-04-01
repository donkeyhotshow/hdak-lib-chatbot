import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages } from '@/lib/db';
import { eq, asc, and } from 'drizzle-orm';
import { stripHtml } from '@/lib/sanitize';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { isForbiddenOrigin } from '@/lib/cors';
import { isValidUuid, getSessionIdStrict } from '@/lib/validation';

const MAX_TITLE_LENGTH = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонений запит' }, { status: 403 });
  }

  const sessionId = getSessionIdStrict(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Відсутній ідентифікатор сесії' }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Невірний ідентифікатор' }, { status: 400 });
    }

    // Only return conversation if it belongs to this session
    const [conversation] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)));

    if (!conversation) return NextResponse.json({ error: 'Розмову не знайдено' }, { status: 404 });

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
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
  }

  const sessionId = getSessionIdStrict(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Відсутній ідентифікатор сесії' }, { status: 400 });
  }

  try {
    const { id } = await params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Невірний ідентифікатор' }, { status: 400 });
    }

    // Only delete if conversation belongs to this session
    const result = await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
      .returning({ id: conversations.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Розмову не знайдено' }, { status: 404 });
    }

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
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
  }

  const sessionId = getSessionIdStrict(request);
  if (!sessionId) {
    return NextResponse.json({ error: 'Відсутній ідентифікатор сесії' }, { status: 400 });
  }

  try {
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

    const title = stripHtml(body.title.trim()).substring(0, MAX_TITLE_LENGTH);
    if (!title) {
      return NextResponse.json({ error: 'Назва не може бути порожньою' }, { status: 400 });
    }

    // Only update if conversation belongs to this session
    const [updated] = await db.update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Розмову не знайдено' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
