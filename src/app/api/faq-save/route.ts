import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';

// Saves a FAQ Q&A pair directly to DB without calling LLM
export async function POST(request: NextRequest) {
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }

  let body: { question?: unknown; answer?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 }); }

  const question = typeof body.question === 'string' ? sanitizeHtml(body.question, { allowedTags: [], allowedAttributes: {} }).trim() : '';
  const answer = typeof body.answer === 'string' ? sanitizeHtml(body.answer, { allowedTags: [], allowedAttributes: {} }).trim() : '';

  if (!question || !answer) {
    return NextResponse.json({ error: 'Запитання та відповідь обов\'язкові' }, { status: 400 });
  }

  const [conv] = await db.insert(conversations).values({
    title: question.substring(0, 50),
  }).returning();

  await db.insert(messagesTable).values([
    { conversationId: conv.id, role: 'USER', content: question },
    { conversationId: conv.id, role: 'ASSISTANT', content: answer },
  ]);

  return NextResponse.json({ conversationId: conv.id });
}
