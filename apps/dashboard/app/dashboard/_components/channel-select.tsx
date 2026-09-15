"use client";

import { getGuildChannels } from "@/app/actions/discord";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller, type FieldPath, type UseFormReturn } from "react-hook-form";
import { type ReactNode, useEffect, useState } from "react";
import { DiscordChannel } from "@/lib/types";

export default function ChannelSelect<TFieldValues extends Record<string, unknown>>({
  guildId,
  form,
  name = "channelId" as FieldPath<TFieldValues>,
  label = "Canal",
  description,
}: {
  guildId: string;
  form: UseFormReturn<TFieldValues>;
  name?: FieldPath<TFieldValues>;
  label?: ReactNode;
  description?: string;
}) {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);

  useEffect(() => {
    getGuildChannels(guildId).then((res) => {
      const textChannels = res.filter((channel: DiscordChannel) => channel.type === 0);
      setChannels(textChannels);
    });
  }, [guildId]);

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Select name={field.name} onValueChange={field.onChange} value={field.value as string}>
            <SelectTrigger className="w-full hover:cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-100">
              <SelectGroup>
                <SelectLabel>Canais</SelectLabel>
                {channels.map((channel: DiscordChannel) => (
                  <SelectItem
                    key={channel.id}
                    value={channel.id}
                    className="hover:cursor-pointer"
                  >
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}