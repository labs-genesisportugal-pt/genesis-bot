import { db } from "./db";

type StarboardPostRow = {
  guild_id: string;
  message_id: string;
  starboard_message_id: string;
  last_star_count: number;
};

const getPostStatement = db.prepare(`
  SELECT guild_id, message_id, starboard_message_id, last_star_count
  FROM starboard_posts
  WHERE guild_id = ? AND message_id = ?
`);

const addPostStatement = db.prepare(`
  INSERT INTO starboard_posts (guild_id, message_id, starboard_message_id, last_star_count)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(guild_id, message_id) DO UPDATE SET
    starboard_message_id = excluded.starboard_message_id,
    last_star_count = excluded.last_star_count
`);

function getPost(guild_id: string, message_id: string): StarboardPostRow | undefined {
  return getPostStatement.get(guild_id, message_id) as StarboardPostRow | undefined;
}

function addPost(guild_id: string, message_id: string, starboard_message_id: string, star_count: number) {
  addPostStatement.run(guild_id, message_id, starboard_message_id, star_count);
}

type StarboardSettingsRow = {
  guild_id: string;
  channel_id: string;
  threshold: number;
};

const getSettingsStatement = db.prepare(`
  SELECT guild_id, channel_id, threshold
  FROM starboard_settings
  WHERE guild_id = ?
`);

const upsertSettingsStatement = db.prepare(`
  INSERT INTO starboard_settings (guild_id, channel_id, threshold)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    channel_id = excluded.channel_id,
    threshold = excluded.threshold
`);

const clearSettingsStatement = db.prepare(`
  DELETE FROM starboard_settings
  WHERE guild_id = ?
`);

function getSettings(guild_id: string): StarboardSettingsRow | undefined {
  return getSettingsStatement.get(guild_id) as StarboardSettingsRow | undefined;
}

function upsertSettings(guild_id: string, channel_id: string, threshold: number) {
  upsertSettingsStatement.run(guild_id, channel_id, threshold);
}

function clearSettings(guild_id: string) {
  clearSettingsStatement.run(guild_id);
}

export const starboardDb = {
  getPost,
  addPost,
  getSettings,
  upsertSettings,
  clearSettings,
};