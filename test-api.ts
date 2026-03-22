import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function testChat() {
  const conversationId = 6; // Использовали в предыдущем успешном тесте
  const body = { content: "Привіт! Хто ти?" };

  try {
    const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("HTTP Error:", response.status, await response.text());
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
    console.error("Fetch error:", err);
  }
}

testChat();
