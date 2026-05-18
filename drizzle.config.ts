import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// The Drizzle CLI doesn't load .env.local the way Next.js does, so read
// DATABASE_URL from the process env, falling back to parsing .env.local
// directly (relative to the directory the command is run from).
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const file = readFileSync(".env.local", "utf8");
    const match = file.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
    if (match) return match[1].replace(/^["']|["']$/g, "");
  } catch {
    /* .env.local not present */
  }
  return "";
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});
