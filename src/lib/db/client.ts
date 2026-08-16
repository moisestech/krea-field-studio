import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const client = postgres(url);
  return drizzle(client, { schema });
}
