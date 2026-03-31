import { NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { lt } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';

// Cleanup conversations older than 90 days
// Call via cron: POST /api/cleanup with Authorization: Bearer <secret>
export async function POST(request: Request) {
  const expectedSecret = process.env.CLEANUP_SECRET;
  if (!expectedSecret) {
    // L13: return same status as auth failure to avoid revealing configuration state
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  // Only accept secret via Authorization header — never via query params (avoids log leakage)
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace(/^Bearer\s+/i, '') ?? '';

  // C3: timing-safe comparison — pad BOTH to same fixed length to avoid
  // length side-channel (padEnd doesn't truncate if secret is longer)
  let authorized = false;
  try {
    const maxLen = Math.max(secret.length, expectedSecret.length, 32);
    const a = Buffer.alloc(maxLen);
    const b = Buffer.alloc(maxLen);
    Buffer.from(secret).copy(a);
    Buffer.from(expectedSecret).copy(b);
    // timingSafeEqual requires equal-length buffers — guaranteed by alloc(maxLen)
    authorized = timingSafeEqual(a, b) && secret.length === expectedSecret.length;
  } catch {
    authorized = false;
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    // Use batched deletes to avoid long table locks
    const deleted = await db.delete(conversations)
      .where(lt(conversations.createdAt, cutoff))
      .returning({ id: conversations.id });

    return NextResponse.json({ deleted: deleted.length, cutoffDate: cutoff.toISOString() });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Помилка очищення' }, { status: 500 });
  }
}
