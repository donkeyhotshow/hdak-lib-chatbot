import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    
    return NextResponse.json({ ...conversation, messages: msgs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await db.delete(conversations).where(eq(conversations.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).hostname !== new URL(request.url).hostname && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }

    const { id } = await params;
    const { title } = await request.json();
    const [updated] = await db.update(conversations).set({ title }).where(eq(conversations.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
