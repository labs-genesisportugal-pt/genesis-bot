"use client";

import { getStarboardSettings, saveStarboardSettings } from "@/app/actions/starboard";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Guild } from "@/lib/types";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import ChannelSelect from "@/app/dashboard/_components/channel-select";

const formSchema = z.object({
  channelId: z.string().min(1, { message: "Selecione um canal" }),
  threshold: z.coerce.number().int().min(1, { message: "O mínimo é 1 estrela" }),
});

export default function Starboard({ guild }: { guild: Guild }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channelId: "",
      threshold: 1,
    },
  });

  useEffect(() => {
    getStarboardSettings(guild.id).then((settings) => {
      if (settings) {
        form.reset({
          channelId: settings.channel_id,
          threshold: settings.threshold,
        });
      }
    });
  }, [guild.id, form]);

  const onSubmit = () => {
    return form.handleSubmit(async (data) => {
      await saveStarboardSettings(guild.id, {
        channel_id: data.channelId,
        threshold: data.threshold,
      });
      window.location.reload();
    });
  };

  return (
    <form onSubmit={onSubmit()} className="flex flex-col gap-4">
      <FieldGroup className="flex flex-row gap-4">
        <ChannelSelect
          guildId={guild.id}
          form={form}
          label={
            <>
              Canal de Starboard
            </>
          }
        />
        <Controller
          name="threshold"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Número mínimo de estrelas
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min={1}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                className="w-32"
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Field>
        <Button type="submit">Guardar</Button>
      </Field>
    </form>
  );
}
