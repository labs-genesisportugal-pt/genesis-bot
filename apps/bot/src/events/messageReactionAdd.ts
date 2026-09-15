import { type Client, type MessageReaction, type User } from "discord.js";
import { starboardHandler } from "../handlers/starboardHandler";

export default async function messageReactionAdd(
  _client: Client,
  reaction: MessageReaction,
  user: User,
) {
  await starboardHandler.handleReactionAdd(reaction, user);
}
