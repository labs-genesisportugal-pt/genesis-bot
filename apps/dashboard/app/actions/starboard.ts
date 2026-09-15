"use server";
import { StarboardSettings } from "@genesis/core";
import { starboardService } from "@genesis/services";

export async function getStarboardSettings(guild_id: string): Promise<StarboardSettings> {
  return await starboardService.getSettings(guild_id);
}

export async function saveStarboardSettings(guild_id: string, settings: StarboardSettings) {
  await starboardService.setSettings(guild_id, {
    channel_id: settings.channel_id,
    threshold: Number(settings.threshold) || 1,
  });
}