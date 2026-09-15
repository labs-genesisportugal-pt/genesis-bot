export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getBotGuilds } from "../actions/discord";

export default async function Dashboard() {
  const guilds = await getBotGuilds();
  redirect(`/dashboard/${guilds[0].id}`);
}
