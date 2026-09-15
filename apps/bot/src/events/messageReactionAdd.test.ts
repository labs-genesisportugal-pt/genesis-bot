import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Client, MessageReaction, User } from "discord.js";

vi.mock("../handlers/starboardHandler", () => ({
  starboardHandler: {
    handleReactionAdd: vi.fn(),
  },
}));

import messageReactionAdd from "./messageReactionAdd";
import { starboardHandler } from "../handlers/starboardHandler";

describe("messageReactionAdd event", () => {
  beforeEach(() => {
    vi.mocked(starboardHandler.handleReactionAdd).mockReset();
  });

  it("delegates to the starboard handler", async () => {
    const client = {} as unknown as Client;
    const reaction = { emoji: { name: "⭐" } } as unknown as MessageReaction;
    const user = { tag: "user#5678" } as unknown as User;

    await messageReactionAdd(client, reaction, user);

    expect(starboardHandler.handleReactionAdd).toHaveBeenCalledWith(reaction, user);
  });
});