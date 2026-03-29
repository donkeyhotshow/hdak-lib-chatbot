import { NextRequest, NextResponse } from 'next/server';
import { db, conversations } from '@/lib/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db.select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt));
    return NextResponse.json(list);
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
