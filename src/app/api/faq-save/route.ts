import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { stripHtml } from '@/lib/sanitize';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { isForbiddenOrigin } from '@/lib/cors';
import { getSessionIdFromRequest } from '@/lib/validation';

const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 10_000;

// Saves a FAQ Q&A pair directly to DB without calling LLM
export async function POST(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
  }

  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }

  let body: { question?: unknown; answer?: unknown };
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100_000) {
      return NextResponse.json({ error: 'Занадто великий запит' }, { status: 413 });
    }
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 });
  }

  const question = typeof body.question === 'string'
    ? stripHtml(body.question).trim().substring(0, MAX_QUESTION_LENGTH)
    : '';
  const answer = typeof body.answer === 'string'
    ? stripHtml(body.answer).trim().substring(0, MAX_ANSWER_LENGTH)
    : '';

  if (!question || !answer) {
    return NextResponse.json({ error: 'Запитання та відповідь обов\'язкові' }, { status: 400 });
  }

  try {
    const sessionId = getSessionIdFromRequest(request);

    const result = await db.transaction(async (tx) => {
      const [conv] = await tx.insert(conversations).values({
        title: question.substring(0, 50),
        sessionId,
      }).returning();

      await tx.insert(messagesTable).values([
        { conversationId: conv.id, role: 'USER', content: question },
        { conversationId: conv.id, role: 'ASSISTANT', content: answer },
      ]);

      return conv;
    });

    return NextResponse.json({ conversationId: result.id });
  } catch (error) {
    console.error('faq-save DB error:', error);
    return NextResponse.json({ error: 'Помилка збереження' }, { status: 500 });
  }
}
