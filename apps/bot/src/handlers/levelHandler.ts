import { Message, TextChannel } from "discord.js";
import { levelDb } from "@genesis/db";
import { xpDb } from "@genesis/db";
import { calculateLevel } from "@genesis/core";

function handleLevelUpNotification(message: Message) {
  if (!message.guildId) return;

  if (xpDb.hasLeveledUp(message.guildId, message.author.id)) {
    const xp = xpDb.getUserXp(message.guildId, message.author.id).textXp;
    if (message.channel instanceof TextChannel)
      message.channel.send(
        `parabéns, <@${message.author.id}>! subiste para o nível ${calculateLevel(xp)}, desempregado.`,
      );
    xpDb.setLeveledUp(false, message.guildId, message.author.id);
  }
}

function handleRoleUpdate(message: Message) {
  if (!message.guildId || !message.member) return;

  const textLevel = calculateLevel(xpDb.getUserXp(message.guildId, message.author.id).textXp);
  const voiceLevel = calculateLevel(xpDb.getUserXp(message.guildId, message.author.id).voiceXp);
  const correctRole = levelDb.getRoleByLevel(
    message.guildId,
    textLevel > voiceLevel ? textLevel : voiceLevel,
  );
  const currentRole = levelDb.getCurrentLevelRole(
    message.guildId,
    message.member.roles.cache.map((r) => r.id),
  );

  if (currentRole != correctRole) {
    if (currentRole) message.member.roles.remove(currentRole);
    message.member.roles.add(correctRole);
  }
}

export const levelHandler = { handleLevelUpNotification, handleRoleUpdate };
