import { Pool } from "pg";
import { env } from "./env.ts";

export const db = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

db.on("connect", () => {
  console.log("PostgreSQL connected");
});

db.on("error", (err) => {
  console.error("PostgreSQL error:", err);
  process.exit(1);
});
