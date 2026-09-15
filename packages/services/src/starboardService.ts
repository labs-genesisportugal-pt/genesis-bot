import { StarboardSettings } from "@genesis/core";
import { starboardDb } from "@genesis/db";

type StarboardSettingsRow = {
  channel_id: string;
  threshold: number;
};

async function getSettings(guild_id: string): Promise<StarboardSettings> {
  const row = starboardDb.getSettings(guild_id);
  if (!row) return { channel_id: "", threshold: 1 };
  return { channel_id: row.channel_id, threshold: row.threshold };
}

async function setSettings(guild_id: string, settings: StarboardSettings) {
  starboardDb.upsertSettings(guild_id, settings.channel_id, settings.threshold);
}

async function clearSettings(guild_id: string) {
  starboardDb.clearSettings(guild_id);
}

export const starboardService = {
  getSettings,
  setSettings,
  clearSettings,
};