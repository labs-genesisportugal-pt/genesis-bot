import { config } from "dotenv";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { loadEvents } from "./handlers/eventHandler";

config();

async function main() {
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("No token.");
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User,
    ],
  });

  await loadEvents(client);
  await client.login(token);
}

void main().catch((err) => {
  console.error("Erro: " + err);
  process.exit(1);
});
