import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from multiple possible locations
const result = dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Debug output
console.log("=== Environment Debug ===");
console.log("Looking for .env at:", path.resolve(__dirname, "../../.env"));
console.log("dotenv result:", result);
console.log("DB_HOST from process.env:", process.env.DB_HOST);
console.log("All env keys:", Object.keys(process.env).filter(k => k.startsWith('DB_')));
console.log("========================\n");

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  DB_HOST: required("DB_HOST"),
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_NAME: required("DB_NAME"),
  DB_USER: required("DB_USER"),
  DB_PASSWORD: required("DB_PASSWORD"),
};