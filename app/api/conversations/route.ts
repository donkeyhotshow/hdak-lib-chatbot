import { NextResponse } from "next/server";
import { chatStorage } from "../../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await chatStorage.seedLibraryData();
    const conversations = await chatStorage.getAllConversations();
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    const safeTitle = typeof title === "string" && title.trim()
      ? title.trim().slice(0, 200)
      : "Нова розмова";
    const conversation = await chatStorage.createConversation(safeTitle);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("CRITICAL ERROR in POST /api/conversations:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
