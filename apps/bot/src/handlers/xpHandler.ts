import type { Message, VoiceState } from "discord.js";
import {
  calculateCompletedSessionBonus,
  calculateLevel,
  calculateTextCheckpointXp,
  calculateVoiceXp,
  calculateXpForLevel,
} from "@genesis/core";
import type { TextSession, XpSource } from "@genesis/db";
import { xpDb } from "@genesis/db";

const TEXT_SESSION_DURATION_MS = 5 * 60000;
const TEXT_CHECKPOINT_MS = 60000;
const TEXT_INACTIVITY_TIMEOUT_MS = 2 * 60000;
const TEXT_CLEANUP_MS = 30000;

type LevelInfo = {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
};

const textSessions = new Map<string, TextSession>();
const voiceJoinTimes = new Map<string, number>();

let lastTextCleanupAt = 0;

async function closeTextSession(session: TextSession, completed: boolean) {
  const bonusXp = completed ? calculateCompletedSessionBonus(session.checkpointIndex) : 0;
  const xpAmount = session.xpPending + bonusXp;

  textSessions.delete(`${session.guildId}:${session.userId}`);

  if (xpAmount > 0) {
    const oldLevel = calculateLevel(xpDb.getUserXp(session.guildId, session.userId).textXp);
    await addXpToUser(session.guildId, session.userId, xpAmount, "text");
    const newLevel = calculateLevel(xpDb.getUserXp(session.guildId, session.userId).textXp);
    if (newLevel > oldLevel) xpDb.setLeveledUp(true, session.guildId, session.userId);
  }
}

async function processTextMessage(message: Message) {
  if (message.author.bot || !message.guild) {
    return;
  }

  const now = message.createdTimestamp || Date.now();

  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${guildId}:${userId}`;
  let session = textSessions.get(key);

  if (!session) {
    textSessions.set(key, {
      guildId,
      userId,
      startAt: now,
      lastMsgAt: now,
      checkpointIndex: 0,
      msgsInInterval: 1,
      xpPending: 0,
    });
    return;
  }

  const elapsedMs = Math.max(now - session.startAt, 0);
  const elapsedCheckpoints = Math.min(
    Math.floor(elapsedMs / TEXT_CHECKPOINT_MS),
    TEXT_SESSION_DURATION_MS / TEXT_CHECKPOINT_MS,
  );

  while (session.checkpointIndex < elapsedCheckpoints) {
    session.xpPending += calculateTextCheckpointXp(session.msgsInInterval);
    session.msgsInInterval = 0;
    session.checkpointIndex += 1;
  }

  if (now - session.startAt >= TEXT_SESSION_DURATION_MS) {
    await closeTextSession(session, true);
    textSessions.set(key, {
      guildId,
      userId,
      startAt: now,
      lastMsgAt: now,
      checkpointIndex: 0,
      msgsInInterval: 1,
      xpPending: 0,
    });
    return;
  }

  session.msgsInInterval += 1;
  session.lastMsgAt = now;

  const inactive = now - session.lastMsgAt > TEXT_INACTIVITY_TIMEOUT_MS;

  if (inactive) {
    await closeTextSession(session, false);
    textSessions.set(key, {
      guildId,
      userId,
      startAt: now,
      lastMsgAt: now,
      checkpointIndex: 0,
      msgsInInterval: 1,
      xpPending: 0,
    });
    return;
  }

  await maybeCleanupExpiredTextSessions(now);
}

async function maybeCleanupExpiredTextSessions(now = Date.now()) {
  if (now - lastTextCleanupAt < TEXT_CLEANUP_MS) {
    return;
  }

  lastTextCleanupAt = now;

  for (const session of [...textSessions.values()]) {
    if (now - session.lastMsgAt > TEXT_INACTIVITY_TIMEOUT_MS) {
      await closeTextSession(session, false);
    }
  }
}

async function processVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member ?? oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const now = Date.now();
  await maybeCleanupExpiredTextSessions(now);

  const guildId = newState.guild.id;
  const userId = member.id;
  const key = `${guildId}:${userId}`;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (oldChannelId === newChannelId) {
    return;
  }

  const joinedAt = voiceJoinTimes.get(key);

  if (oldChannelId && joinedAt !== undefined) {
    const durationMs = now - joinedAt;
    const xpAmount = calculateVoiceXp(durationMs);

    voiceJoinTimes.delete(key);

    if (xpAmount > 0) {
      await addXpToUser(guildId, userId, xpAmount, "voice");
    }
  }

  if (newChannelId) {
    voiceJoinTimes.set(key, now);
  }
}

async function addXpToUser(guildId: string, userId: string, amount: number, source: XpSource) {
  const xpAmount = Math.max(Math.floor(amount), 0);

  if (xpAmount === 0) {
    return;
  }

  const userXp = xpDb.addXp(guildId, userId, xpAmount, source);
  const totalXp = source === "text" ? userXp.textXp : userXp.voiceXp;
  const level = calculateLevel(totalXp);

  console.log(
    `[xp] ${source}: +${xpAmount} XP for ${guildId}/${userId} (total=${totalXp}, level=${level})`,
  );
}

function buildProgress(totalXp: number): LevelInfo {
  const level = calculateLevel(totalXp);
  const currentLevelXp = calculateXpForLevel(level);
  const nextLevelXp = calculateXpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpForNextLevel = nextLevelXp - currentLevelXp;
  const xpToNextLevel = nextLevelXp - totalXp;

  return {
    totalXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    xpToNextLevel,
  };
}

function getLevelInfo(guildId: string, userId: string) {
  const userXp = xpDb.getUserXp(guildId, userId);
  const userPendingXp = textSessions.get(`${guildId}:${userId}`)?.xpPending ?? 0;

  return {
    text: buildProgress(userXp.textXp + userPendingXp),
    voice: buildProgress(userXp.voiceXp),
  };
}

export const xpHandler = {
  processTextMessage,
  processVoiceStateUpdate,
  getLevelInfo,
};
