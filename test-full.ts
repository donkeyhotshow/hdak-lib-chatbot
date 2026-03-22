import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function testChat() {
  try {
    // 1. Create a new conversation
    const createRes = await fetch(`http://localhost:3001/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Full Flow" }),
    });

    if (!createRes.ok) {
      console.error("Create Chat Error:", createRes.status, await createRes.text());
      return;
    }

    const { id: conversationId } = await createRes.json();
    console.log("Created conversation ID:", conversationId);

    // 2. Send message
    const body = { content: "Привіт! Дай коротку інформацію про бібліотеку ХДАК." };
    const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("HTTP Error (Messages):", response.status, await response.text());
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log("Chunk:", decoder.decode(value));
    }
  } catch (err) {
    console.error("Fetch/Script error:", err);
  }
}

testChat();
