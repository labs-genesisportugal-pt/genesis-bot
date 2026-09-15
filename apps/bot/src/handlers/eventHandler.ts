import { readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Client } from "discord.js";


export async function loadEvents(client: Client) {
  const eventsPath = join(__dirname, "..", "events");
  const eventFiles = readdirSync(eventsPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (file) =>
        [".js", ".ts"].includes(extname(file)) &&
        !file.endsWith(".d.ts") &&
        !file.endsWith(".test.ts") &&
        !file.endsWith(".test.js"),
    );

  for (const file of eventFiles) {
    const eventName = basename(file, extname(file));
    const eventPath = join(eventsPath, file);
    const eventModule = await import(pathToFileURL(eventPath).href);
    const eventHandler = eventModule.default!.default ?? eventModule.default;

    if (!eventHandler) {
      console.warn(`Handler não encontrado.`);
      continue;
    }

    client.on(eventName, async (...args: unknown[]) => {
      try {
        await eventHandler(client, ...args);
      } catch (error) {
        console.error(`Erro:`, error);
      }
    });
  }
}
