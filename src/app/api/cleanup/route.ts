import { NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { lt, sql } from 'drizzle-orm';

// Cleanup conversations older than 90 days
// Call via cron or manually: GET /api/cleanup?secret=...
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
