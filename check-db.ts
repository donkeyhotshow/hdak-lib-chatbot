import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { db, conversations } from "./lib/db";

async function check() {
  try {
    const res = await db.select().from(conversations);
    console.log("Conversations:", res);
  } catch (err) {
    console.error("DB Error:", err);
  }
}
check();
