import { NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { lt } from 'drizzle-orm';

// Cleanup conversations older than 90 days
// Call via cron: POST /api/cleanup with Authorization: Bearer <secret>
export async function POST(request: Request) {
  const expectedSecret = process.env.CLEANUP_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Очищення не налаштовано' }, { status: 503 });
  }

  // Secret from Authorization header (preferred) or query param (backward compat)
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace(/^Bearer\s+/i, '')
    || new URL(request.url).searchParams.get('secret');

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const deleted = await db.delete(conversations)
      .where(lt(conversations.createdAt, cutoff))
      .returning({ id: conversations.id });

    return NextResponse.json({ deleted: deleted.length, cutoffDate: cutoff.toISOString() });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Помилка очищення' }, { status: 500 });
  }
}
