import Image from "next/image";
import bg_tex from "../assets/bg_tex.jpg";
import logo from "../assets/genesisportugal_logo.svg";
import DiscordLogin from "./_components/discordlogin";
import DashboardButton from "./_components/dashboardbutton";
import { auth } from "./auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex h-[calc(100vh-(var(--spacing)*20))] items-center mx-30">
      <Image
        src={bg_tex}
        alt="background texture"
        className="inset-0 top-0 left-0 right-0 bottom-0 fixed w-screen h-full object-cover opacity-3 -z-500"
      />
      <Image
        src={logo}
        alt="genesis portugal logo"
        width={640}
        height={640}
        className="right-30 absolute w-auto h-120 object-cover pointer-events-none animate-float"
      />
      <div className="flex flex-col gap-16 items-start">
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-sans font-bold">
            100% português.
            <br />
            100% open source.
          </h1>
          <p className="font-mono text-[#AAA]">
            O genesis.bot é um bot FOSS multi-funções
            <br />
            criado e mantido por membros da comunidade
            <br />
            Genesis Portugal.
          </p>
        </div>
        {session && session.user ? <DashboardButton /> : <DiscordLogin />}
      </div>
    </div>
  );
}
