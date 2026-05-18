// Neon-backed Drizzle database client. Server-only.
//
// When DATABASE_URL is absent the client is still constructed (with a
// placeholder) so imports never crash — but it is never queried, because
// every caller guards on `isBackendConfigured` first.
import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

const PLACEHOLDER_URL = "postgresql://placeholder:placeholder@localhost/placeholder";

const sql = neon(process.env.DATABASE_URL ?? PLACEHOLDER_URL);

export const db = drizzle(sql, { schema });
