import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as allRelations from "./relations";
import * as allSchema from "./schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const db = drizzle(pool, {
  schema: {
    ...allRelations,
    ...allSchema,
  },
});

export default db;
