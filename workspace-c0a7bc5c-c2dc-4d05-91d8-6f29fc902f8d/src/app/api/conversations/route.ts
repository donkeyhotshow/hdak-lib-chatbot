import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get first message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    const conversation = await db.conversation.create({
      data: {
        title: title || 'Новий діалог',
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
