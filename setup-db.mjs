import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root
try {
  const env = readFileSync(join(__dirname, ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS relationships (
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_at TEXT,
    PRIMARY KEY (user_id, character_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_messages_user_char ON messages (user_id, character_id, created_at)
`);

console.log("✅ Banco de dados configurado com sucesso!");
process.exit(0);
