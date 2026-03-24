import { neon } from "@neondatabase/serverless";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found");
    process.exit(1);
  }
  const sql = neon(url);
  try {
    console.log("Clearing library_info...");
    await sql`DELETE FROM library_info;`;
    console.log("Clearing library_resources...");
    await sql`DELETE FROM library_resources;`;
    console.log("Successfully cleared tables. Restart the app to reseed.");
  } catch (err) {
    console.error("Error clearing tables:", err);
  }
}

run();
