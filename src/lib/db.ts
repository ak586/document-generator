import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in .env.local");
}

const isRemotePostgres = /rds\.amazonaws\.com/.test(databaseUrl);

export const db = new Pool({
  connectionString: databaseUrl,
  ssl: isRemotePostgres
    ? {
        rejectUnauthorized: false
      }
    : false
});
