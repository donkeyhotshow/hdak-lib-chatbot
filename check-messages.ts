import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { db, messages } from "./lib/db";
import { eq } from "drizzle-orm";

async function check() {
  const conversationId = 8;
  try {
    const res = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
    console.log("Messages for ID 8:", res);
  } catch (err) {
    console.error("DB Error:", err);
  }
}
check();
