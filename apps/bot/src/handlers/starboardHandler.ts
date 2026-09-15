import { EmbedBuilder, type Message, type MessageReaction, type TextChannel, type User } from "discord.js";
import { starboardDb } from "@genesis/db";
import { starboardService } from "@genesis/services";

export const STAR_EMOJI = "⭐";

export async function getStarCount(message: Message): Promise<number> {
  await message.fetch().catch(() => null);
  const reaction = message.reactions.cache.get(STAR_EMOJI);
  return reaction?.count ?? 0;
}

export function findMedia(message: Message): { url: string } | null {
  const attachment = message.attachments.find((attachment) => {
    const { contentType, name } = attachment;
    return (
      contentType?.startsWith("image/") === true ||
      contentType?.startsWith("video/") === true ||
      /\.(png|jpe?g|gif|webp|mp4|webm)$/i.test(name ?? "")
    );
  });

  if (attachment) {
    return { url: attachment.url };
  }

  const embed = message.embeds.find((emb) => emb.image || emb.video || emb.thumbnail);
  const media = embed?.image ?? embed?.video ?? embed?.thumbnail;

  if (media) {
    return { url: media.url };
  }

  return null;
}

export function buildStarEmbed(message: Message, starCount: number, channelName: string) {
  const jumpLink = `https://discord.com/channels/${message.guildId}/${message.channel.id}/${message.id}`;

  let description = message.content || "";
  if (description.length > 2000) {
    description = `${description.slice(0, 1997)}...`;
  }

  const embed = new EmbedBuilder()
    .setColor(0xffac33)
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp(message.createdAt)
    .setFooter({ text: `${STAR_EMOJI} ${starCount} | #${channelName}` });

  if (description) {
    embed.setDescription(`${description}\n\n[Ver mensagem original](${jumpLink})`);
  } else {
    embed.setDescription(`[Ver mensagem original](${jumpLink})`);
  }

  const media = findMedia(message);
  if (media) {
    embed.setImage(media.url);

  }

  return embed;
}

export async function postToStarboard(message: Message, starCount: number, channel: TextChannel) {
  const embed = buildStarEmbed(message, starCount, (message.channel as TextChannel)?.name ?? "");
  return channel.send({ embeds: [embed] }).catch(() => null);
}

async function handleReactionAdd(reaction: MessageReaction, user: User) {
  if (user.bot || reaction.emoji.name !== STAR_EMOJI) {
    return;
  }

  if (reaction.partial) {
    const fetched = await reaction.fetch().catch(() => null);
    if (!fetched) {
      return;
    }
  }

  let message = reaction.message as Message;

  if (message.partial) {
    const fetched = await message.fetch().catch(() => null);
    if (!fetched) {
      return;
    }
    message = fetched;
  }

  const guild = message.guild;

  if (!guild || message.author?.id === user.id) {
    return;
  }

  const starCount = await getStarCount(message);

  const settings = await starboardService.getSettings(guild.id);
  const threshold = settings.threshold;
  const channelId = settings.channel_id;

  if (!channelId) {
    return;
  }

  if (starCount < threshold) {
    return;
  }

  const fetchedChannel = await guild.channels.fetch(channelId).catch(() => null);

  if (!fetchedChannel?.isTextBased()) {
    return;
  }

  const starChannel = fetchedChannel as TextChannel;
  const existing = starboardDb.getPost(guild.id, message.id);

  if (existing) {
    const starMessage = await starChannel.messages
      .fetch(existing.starboard_message_id)
      .catch(() => null);

    if (starMessage) {
      const embed = buildStarEmbed(message, starCount, (message.channel as TextChannel)?.name ?? "");
      await starMessage.edit({ embeds: [embed] }).catch(() => null);
      starboardDb.addPost(guild.id, message.id, starMessage.id, starCount);
      return;
    }
  }

  const posted = await postToStarboard(message, starCount, starChannel);

  if (posted) {
    starboardDb.addPost(guild.id, message.id, posted.id, starCount);
  }
}

export const starboardHandler = {
  handleReactionAdd,
};
