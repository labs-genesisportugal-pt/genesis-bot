import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";

const dockerDbPath = "/app/data/bot.db";
const localDbPath = resolve(process.cwd(), "../../", "data", "bot.db");
const configuredDbPath = process.env.BOT_DB_PATH;

let dbPath = configuredDbPath ?? dockerDbPath;

try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (error) {
  const err = error as NodeJS.ErrnoException;

  if (configuredDbPath || (err.code !== "EACCES" && err.code !== "EPERM")) {
    throw error;
  }

  dbPath = localDbPath;
  mkdirSync(dirname(dbPath), { recursive: true });
}

export const db: DB = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_xp (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text_xp INTEGER NOT NULL DEFAULT 0,
    voice_xp INTEGER NOT NULL DEFAULT 0,
    has_leveled_up BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS level_roles (
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id TEXT NOT NULL,
    ticket_message_id TEXT NOT NULL,
    ticket_type TEXT NOT NULL,
    PRIMARY KEY (guild_id, ticket_type, ticket_message_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS triggers (
   guild_id TEXT NOT NULL,
   trigger_id TEXT NOT NULL,
   trigger_content TEXT NOT NULL,
   allowed_roles TEXT NOT NULL,
   PRIMARY KEY (guild_id, trigger_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS starboard_posts (
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    starboard_message_id TEXT NOT NULL,
    last_star_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, message_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS starboard_settings (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL DEFAULT '',
    threshold INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id)
  )
`);
