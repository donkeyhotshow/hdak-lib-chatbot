import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { chatStorage } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const conversation = await chatStorage.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const messages = await chatStorage.getMessagesByConversation(conversationId);
    return NextResponse.json({ ...conversation, messages });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await chatStorage.deleteConversation(parseInt(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
