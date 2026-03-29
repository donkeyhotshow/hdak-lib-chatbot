import { NextRequest, NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { desc } from 'drizzle-orm';

const PAGE_SIZE = 15;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10), 50);

    const list = await db.select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(limit + 1)   // fetch one extra to know if there are more
      .offset(offset);

    const hasMore = list.length > limit;
    const items = hasMore ? list.slice(0, limit) : list;

    return NextResponse.json({ items, hasMore, offset, limit });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && process.env.NODE_ENV === 'production') {
      const originHost = new URL(origin).hostname;
      const reqHost = new URL(request.url).hostname;
      const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(originHost) && ['localhost', '127.0.0.1', '0.0.0.0'].includes(reqHost);
      if (originHost !== reqHost && !isLocal) {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
      }
    }

    const { title } = await request.json();
    const [newConv] = await db.insert(conversations).values({
      title: title || 'Новий діалог',
    }).returning();
    return NextResponse.json(newConv);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}