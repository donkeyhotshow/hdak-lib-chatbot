import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { chatStorage } from "@/lib/storage";

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
    const conversation = await chatStorage.createConversation(title || "Нова розмова");
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
