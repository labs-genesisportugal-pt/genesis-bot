import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Message, MessageReaction, TextChannel, User } from "discord.js";
import { starboardDb } from "@genesis/db";
import { starboardService } from "@genesis/services";
import { starboardHandler, getStarCount, findMedia, buildStarEmbed, postToStarboard, STAR_EMOJI } from "./starboardHandler";

vi.mock("@genesis/db", () => ({
  starboardDb: {
    getPost: vi.fn(),
    addPost: vi.fn(),
  },
}));

vi.mock("@genesis/services", () => ({
  starboardService: {
    getSettings: vi.fn(() => undefined),
  },
}));

type TextChannelLike = {
  isTextBased: () => boolean;
  name: string;
  id: string;
  send: ReturnType<typeof vi.fn>;
  messages: { fetch: ReturnType<typeof vi.fn> };
};

function makeChannel(overrides: Partial<TextChannelLike> = {}): TextChannelLike {
  return {
    isTextBased: () => true,
    name: "starboard",
    id: "channel-1",
    send: vi.fn(async () => ({ id: "star-msg-1" })),
    messages: { fetch: vi.fn(async () => null) },
    ...overrides,
  };
}

type ReactionCacheGet = () => { count: number } | undefined;

type MessageLike = {
  id: string;
  guildId: string;
  guild: { id: string; channels: { fetch: ReturnType<typeof vi.fn> } } | null;
  channel: { id: string; name?: string };
  author: { id: string; tag: string; displayAvatarURL: () => string };
  createdAt: Date;
  content: string;
  attachments: { find: (...args: unknown[]) => unknown };
  embeds: Array<{ image?: { url: string }; video?: { url: string }; thumbnail?: { url: string } }>;
  fetch: ReturnType<typeof vi.fn>;
  partial?: boolean;
  reactions: { cache: { get: ReactionCacheGet } };
};

function makeMessage(overrides: Partial<MessageLike> = {}): MessageLike {
  const channel = makeChannel();
  return {
    id: "msg-1",
    guildId: "guild-1",
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn(async () => channel) },
    },
    channel: { id: "chn-1" },
    author: { id: "author-1", tag: "author#1234", displayAvatarURL: () => "https://avatar.png" },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    content: "hello world",
    attachments: { find: vi.fn(() => undefined) },
    embeds: [],
    fetch: vi.fn(async () => undefined),
    partial: false,
    reactions: { cache: { get: () => undefined } },
    ...overrides,
  };
}

function makeReaction(message: MessageLike, overrides: Record<string, unknown> = {}): MessageReaction {
  return {
    emoji: { name: STAR_EMOJI },
    partial: false,
    message: message as unknown as Message,
    fetch: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as MessageReaction;
}

function makeUser(overrides: Record<string, unknown> = {}): User {
  return {
    bot: false,
    id: "user-1",
    tag: "user#5678",
    ...overrides,
  } as unknown as User;
}

describe("findMedia", () => {
  it("returns attachment url when contentType is image", () => {
    const message = makeMessage({
      attachments: { find: () => ({ contentType: "image/png", name: "a.png", url: "https://img" }) },
    });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://img" });
  });

  it("returns attachment url when contentType is video", () => {
    const message = makeMessage({
      attachments: { find: () => ({ contentType: "video/mp4", name: "a.mp4", url: "https://vid" }) },
    });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://vid" });
  });

  it("matches attachment by filename when contentType is missing", () => {
    const message = makeMessage({
      attachments: { find: () => ({ contentType: null, name: "cat.GIF", url: "https://gif" }) },
    });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://gif" });
  });

  it("falls back to embed image", () => {
    const message = makeMessage({ embeds: [{ image: { url: "https://embed-img" } }] });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://embed-img" });
  });

  it("falls back to embed video", () => {
    const message = makeMessage({ embeds: [{ video: { url: "https://embed-vid" } }] });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://embed-vid" });
  });

  it("falls back to embed thumbnail", () => {
    const message = makeMessage({ embeds: [{ thumbnail: { url: "https://thumb" } }] });
    expect(findMedia(message as unknown as Message)).toEqual({ url: "https://thumb" });
  });

  it("returns null when there is no media", () => {
    const message = makeMessage({ attachments: { find: () => undefined }, embeds: [{}] });
    expect(findMedia(message as unknown as Message)).toBeNull();
  });
});

describe("getStarCount", () => {
  it("returns the star reaction count", async () => {
    const message = makeMessage({
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    expect(await getStarCount(message as unknown as Message)).toBe(5);
  });

  it("returns 0 when there is no star reaction", async () => {
    const message = makeMessage({ reactions: { cache: { get: () => undefined } } });
    expect(await getStarCount(message as unknown as Message)).toBe(0);
  });

  it("keeps reading the count when the partial fetch fails", async () => {
    const message = makeMessage({
      fetch: vi.fn(async () => {
        throw new Error("boom");
      }),
      reactions: { cache: { get: () => ({ count: 4 }) } },
    });
    expect(await getStarCount(message as unknown as Message)).toBe(4);
  });
});

describe("buildStarEmbed", () => {
  it("sets color, author, timestamp and footer", () => {
    const embed = buildStarEmbed(makeMessage() as unknown as Message, 7, "general");
    expect(embed.data.color).toBe(0xffac33);
    expect(embed.data.author).toEqual({
      name: "author#1234",
      icon_url: "https://avatar.png",
      url: undefined,
    });
    expect(embed.data.timestamp).toEqual("2026-01-01T00:00:00.000Z");
    expect(embed.data.footer?.text).toBe("⭐ 7 | #general");
  });

  it("includes content and a jump link", () => {
    const embed = buildStarEmbed(makeMessage({ content: "nice" }) as unknown as Message, 3, "general");
    expect(embed.data.description).toContain("nice");
    expect(embed.data.description).toContain(
      "https://discord.com/channels/guild-1/chn-1/msg-1",
    );
  });

  it("only includes the jump link when there is no content", () => {
    const embed = buildStarEmbed(makeMessage({ content: "" }) as unknown as Message, 3, "general");
    expect(embed.data.description).toBe("[Ver mensagem original](https://discord.com/channels/guild-1/chn-1/msg-1)");
  });

  it("truncates long content", () => {
    const embed = buildStarEmbed(makeMessage({ content: "a".repeat(2500) }) as unknown as Message, 3, "general");
    expect(embed.data.description).toBe(
      `${"a".repeat(1997)}...\n\n[Ver mensagem original](https://discord.com/channels/guild-1/chn-1/msg-1)`,
    );
  });

  it("sets the image when media is present", () => {
    const message = makeMessage({
      attachments: { find: () => ({ contentType: "image/png", name: "a.png", url: "https://img" }) },
    });
    const embed = buildStarEmbed(message as unknown as Message, 3, "general");
    expect(embed.data.image?.url).toBe("https://img");
  });
});

describe("postToStarboard", () => {
  it("sends an embed to the starboard channel", async () => {
    const channel = makeChannel() as unknown as TextChannel;
    await postToStarboard(makeMessage({ content: "top" }) as unknown as Message, 10, channel);
    expect(channel.send).toHaveBeenCalledWith({ embeds: expect.any(Array) });
  });

  it("returns null when the send fails", async () => {
    const channel = makeChannel({ send: vi.fn(async () => {
      throw new Error("boom");
    }) }) as unknown as TextChannel;
    expect(await postToStarboard(makeMessage() as unknown as Message, 3, channel)).toBeNull();
  });
});

describe("handleReactionAdd", () => {
  beforeEach(() => {
    vi.mocked(starboardDb.getPost).mockReset().mockReturnValue(undefined);
    vi.mocked(starboardDb.addPost).mockReset();
    vi.mocked(starboardService.getSettings).mockReset().mockResolvedValue({
      channel_id: "channel-1",
      threshold: 1,
    });
  });

  it("ignores bots", async () => {
    const message = makeMessage();
    const reaction = makeReaction(message);
    await starboardHandler.handleReactionAdd(reaction, makeUser({ bot: true }));
    expect(message.guild?.channels.fetch).not.toHaveBeenCalled();
  });

  it("ignores reactions that are not the star emoji", async () => {
    const message = makeMessage();
    const reaction = makeReaction(message, { emoji: { name: "🔥" } });
    await starboardHandler.handleReactionAdd(reaction, makeUser());
    expect(message.guild?.channels.fetch).not.toHaveBeenCalled();
  });

  it("returns when the partial reaction cannot be fetched", async () => {
    const message = makeMessage();
    const reaction = makeReaction(message, {
      partial: true,
      fetch: vi.fn(async () => null) as unknown as (() => Promise<unknown>),
    });
    await starboardHandler.handleReactionAdd(reaction, makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("returns when the partial message cannot be fetched", async () => {
    const reaction = makeReaction(makeMessage({ partial: true, fetch: vi.fn(async () => null) }));
    await starboardHandler.handleReactionAdd(reaction, makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("returns when the message has no guild", async () => {
    const reaction = makeReaction(makeMessage({ guild: null }));
    await starboardHandler.handleReactionAdd(reaction, makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("ignores the author reacting to their own message", async () => {
    const reaction = makeReaction(makeMessage({ author: { id: "user-1", tag: "a#1", displayAvatarURL: () => "x" } }));
    await starboardHandler.handleReactionAdd(reaction, makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("returns when the star count is below the threshold", async () => {
    const message = makeMessage({
      reactions: { cache: { get: () => ({ count: 0 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(message.guild?.channels.fetch).not.toHaveBeenCalled();
  });

  it("does not post when no starboard channel is configured", async () => {
    vi.mocked(starboardService.getSettings).mockResolvedValue({ channel_id: "", threshold: 1 });
    const message = makeMessage({
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(message.guild?.channels.fetch).not.toHaveBeenCalled();
    expect(starboardDb.addPost).not.toHaveBeenCalled();
  });

  it("uses the per-guild threshold from settings", async () => {
    const channel = makeChannel();
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => channel) } },
      reactions: { cache: { get: () => ({ count: 3 }) } },
    });
    vi.mocked(starboardService.getSettings).mockResolvedValue({ channel_id: "channel-1", threshold: 5 });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(message.guild?.channels.fetch).not.toHaveBeenCalled();
  });

  it("uses the per-guild channel from settings", async () => {
    const channel = makeChannel();
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => channel) } },
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    vi.mocked(starboardService.getSettings).mockResolvedValue({ channel_id: "channel-2", threshold: 1 });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(message.guild?.channels.fetch).toHaveBeenCalledWith("channel-2");
  });

  it("returns when the starboard channel cannot be fetched", async () => {
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => null) } },
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("returns when the starboard channel is not text based", async () => {
    const message = makeMessage({
      guild: {
        id: "guild-1",
        channels: { fetch: vi.fn(async () => makeChannel({ isTextBased: () => false })) },
      },
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(starboardDb.getPost).not.toHaveBeenCalled();
  });

  it("posts a new starboard message and saves the post", async () => {
    const channel = makeChannel();
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => channel) } },
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(channel.send).toHaveBeenCalledWith({ embeds: expect.any(Array) });
    expect(starboardDb.addPost).toHaveBeenCalledWith("guild-1", "msg-1", "star-msg-1", 5);
  });

  it("edits the existing starboard message when a post exists", async () => {
    const starboardMessage = { id: "star-old", edit: vi.fn(async () => undefined) };
    const channel = makeChannel({ messages: { fetch: vi.fn(async () => starboardMessage) } });
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => channel) } },
      reactions: { cache: { get: () => ({ count: 8 }) } },
    });
    vi.mocked(starboardDb.getPost).mockReturnValue({
      guild_id: "guild-1",
      message_id: "msg-1",
      starboard_message_id: "star-old",
      last_star_count: 3,
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(channel.send).not.toHaveBeenCalled();
    expect(starboardMessage.edit).toHaveBeenCalledWith({ embeds: expect.any(Array) });
    expect(starboardDb.addPost).toHaveBeenCalledWith("guild-1", "msg-1", "star-old", 8);
  });

  it("re-posts when the old starboard message was deleted", async () => {
    const channel = makeChannel({ messages: { fetch: vi.fn(async () => null) } });
    const message = makeMessage({
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => channel) } },
      reactions: { cache: { get: () => ({ count: 6 }) } },
    });
    vi.mocked(starboardDb.getPost).mockReturnValue({
      guild_id: "guild-1",
      message_id: "msg-1",
      starboard_message_id: "star-gone",
      last_star_count: 3,
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    expect(channel.send).toHaveBeenCalled();
    expect(starboardDb.addPost).toHaveBeenCalledWith("guild-1", "msg-1", "star-msg-1", 6);
  });

  it("uses the source channel name in the embed footer", async () => {
    const starboardChannel = makeChannel({ name: "starboard" });
    const message = makeMessage({
      channel: { id: "chn-original", name: "general" },
      guild: { id: "guild-1", channels: { fetch: vi.fn(async () => starboardChannel) } },
      reactions: { cache: { get: () => ({ count: 5 }) } },
    });
    await starboardHandler.handleReactionAdd(makeReaction(message), makeUser());
    const sent = vi.mocked(starboardChannel.send).mock.calls[0][0] as { embeds: Array<{ data: { footer?: { text?: string } } }> };
    const footer = sent.embeds[0].data.footer?.text ?? "";
    expect(footer).toContain("#general");
    expect(footer).not.toContain("#starboard");
  });
});